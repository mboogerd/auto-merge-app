import { Application } from 'probot'
import { PR } from './model'
import { Client } from './pr-client'
import { Async } from './async'

export = (app: Application) => {

  // Main route, handle checksuite events
  app.on('checksuite', async context => {
    const action = context.payload.action
    const check_suite = context.payload.check_suite

    if (action == PR.actionCompleted && check_suite.conclusion == PR.conclusionSuccess) {
      app.log(`Processing checksuite event for pull requests ${check_suite.pull_requests}`)

      const prs = await Async.parMap(
        Client.getPullRequestIDsFromCheckSuite(context.payload),
        prID => Client.getPullRequest(context, prID))

      const mergeResults = await Async.parMap(
        prs.filter(pr => pr.shouldMerge()),
        pr => Client.mergePR(context, pr)
      )

      mergeResults.forEach(pr => app.log(pr.toString()))
    } else {
      app.log(`Ignoring checksuite event {action: ${action}, conclusion: ${PR.conclusionSuccess}}`)
    }
  })
}
