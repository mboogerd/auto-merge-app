import { Application, Context } from 'probot'
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

  // Deprecated: remove once Ebay migrates to Github 2.14 (and cleanup unused functions!)
  app.on('pull_request', async context => {
    if (context.payload.action == PR.actionPrLabeled)
      delayedMerge(context, Client.getPullRequestId(context.payload))
  })

  async function delayedMerge(context: Context, prId: PR.PrId) {
    app.log(`Polling PR ${prId} every 5 minutes to see whether it can be merged (DEPRECATED ONCE MIGRATED TO GITHUB 2.14)`)

    Client.waitUntilActionable(context, prId).then(async pr => {
      if (pr.shouldMerge()) {
        app.log(`Merging PR: ${pr}`)
        const mergedPR = await Client.mergePR(context, pr)
        app.log(`Merged PR: ${mergedPR}`)
      } else
        app.log(`Stop monitoring of PR ${pr}`)
    })
  }
}
