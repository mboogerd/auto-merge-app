import { Application, Context } from 'probot'
import { WebhookPayloadWithRepository } from 'probot/lib/context'
import { PR } from './model'

export = (app: Application) => {

  // Main route, handle checksuite events
  app.on('checksuite', async context => {
    const action = context.payload.action
    const check_suite = context.payload.check_suite

    if (action == PR.actionCompleted && check_suite.conclusion == PR.conclusionSuccess) {
      app.log(`Processing checksuite event for pull requests ${check_suite.pull_requests}`)

      const mergeResults =
        await mergePRs(context,
          await getPullRequests(context,
            getPullRequestIDs(context.payload)))

      mergeResults.forEach(x => app.log(x.toString()))
    } else {
      app.log(`Ignoring checksuite event {action: ${action}, conclusion: ${PR.conclusionSuccess}}`)
    }
  })

  const numberFromRightRegex = /.*\/([0-9]+)/
  /**
   * @param payload The payload of a `checksuite` Github event
   * @returns an array of pull-request identifiers {owner, repo, number} involved in this payload
   */
  function getPullRequestIDs(payload: WebhookPayloadWithRepository): Array<PR.PrId> {
    const repoName = payload.repository.full_name
    const owner = payload.repository.owner.login
    return payload.check_suite.pull_requests.map((prURL: string) => {
      // @ts-ignore
      return { owner: owner, repo: repoName, number: parseInt(numberFromRightRegex.exec(prURL)[1]) }
    })
  }


  /**
   * get all the pull requests given their identifiers
   * @param context 
   * @param prIDs the identifiers of the pull-requests to fetch
   * @returns a promise containing the pull-requests for the given `prIDs`
   */
  function getPullRequests(context: Context, prIDs: Array<PR.PrId>): Promise<Array<PR.PullRequest>> {
    const promisedPRs = prIDs.map(prID =>
      context.github.pullRequests.get(prID).then(pr => new PR.PullRequest(prID, pr))
    )
    return Promise.all(promisedPRs)
  }

  /**
   * Invokes the merging of all the given pull-requests
   * @param context 
   * @param prs pull-requests to merge
   * @returns a promise containing an array of PR-keys mapped to merge-invocation-response
   */
  function mergePRs(context: Context, prs: Array<PR.PullRequest>): Promise<Array<PR.PullRequest>> {
    const mergeInvocations = prs.map(pr => {
      if (pr.shouldMerge())
        return context.github.pullRequests
          .merge(pr.id)
          // `undefined` error if just passing this as a function literal
          .then(r => pr.registerMergeResult(r))
      else
        return pr
    })
    return Promise.all(mergeInvocations)
  }
}