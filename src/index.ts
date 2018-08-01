import { Application, Context } from 'probot'
import { WebhookPayloadWithRepository } from 'probot/lib/context'
import { AnyResponse } from '@octokit/rest'

const actionCompleted = 'completed'
const conclusionSuccess = 'success'
const mergeWhenReady = 'merge when ready'
const numberFromRightRegex = /.*\/([0-9]+)/

declare class PullRequestId {
  owner: string
  repo: string
  number: number
}

declare class Label {
  name: string
  number: number
}

enum MergeResult {
  Merged,   // Is already merged
  Unmerged, // Isn't merged yet (and we may attempt so, if eligible)
  Failed,   // Attempted to merge and failed
  Success   // Attempted to merge and succeeded
}

class PullRequest {
  id: PullRequestId
  labels: Array<Label>
  mergeable: boolean
  merged: MergeResult

  constructor(id: PullRequestId, anyResponse: AnyResponse) {
    this.id = id
    // @ts-ignore
    this.labels = anyResponse.labels
    // @ts-ignore
    this.mergeable = anyResponse.mergeable
    // @ts-ignore
    if(anyResponse.merged)
      this.merged = MergeResult.Merged
    else
      this.merged = MergeResult.Unmerged
  }

  shouldMerge(): boolean {
    return this.labels.some(l => l.name.toLowerCase() == mergeWhenReady)
      && this.mergeable
      && this.merged == MergeResult.Unmerged
  }

  registerMergeResult(result: AnyResponse): PullRequest {
    // @ts-ignore
    if(result.merged == true)
      this.merged = MergeResult.Success
    else
      this.merged = MergeResult.Failed
    
    return this
  }
}

export = (app: Application) => {

  // Main route, handle checksuite events
  app.on('checksuite', async context => {
    const action = context.payload.action
    const check_suite = context.payload.check_suite

    if (action == actionCompleted && check_suite.conclusion == conclusionSuccess) {
      app.log(`Processing checksuite event for pull requests ${check_suite.pull_requests}`)
      
      const mergeResults =
        await mergePRs(context,
          await getPullRequests(context,
            getPullRequestIDs(context.payload)))
      
      mergeResults.forEach(pr => app.log(`Merge result for ${pr.id} is ${pr.merged}`))
    } else {
      app.log(`Ignoring checksuite event {action: ${action}, conclusion: ${conclusionSuccess}}`)
    }
  })

  /**
   * @param {*} payload
   * @returns an array of pull-request identifiers {owner, repo, number} involved in this payload
   */
  function getPullRequestIDs(payload: WebhookPayloadWithRepository): Array<PullRequestId> {
    const repoName = payload.repository.full_name
    const owner = payload.repository.owner.login
    return payload.check_suite.pull_requests.map((prURL: string) => {
      // @ts-ignore
      return {owner: owner, repo: repoName, number: parseInt(numberFromRightRegex.exec(prURL)[1])}
    })
  }

  /**
   * get all the pull requests given their identifiers
   * @param {*} context 
   * @param {*} prIDs 
   */
  function getPullRequests(context: Context, prIDs: Array<PullRequestId>): Promise<Array<PullRequest>> {
    const promisedPRs = prIDs.map(prID => 
      context.github.pullRequests.get(prID).then(pr => new PullRequest(prID, pr))
    )
    return Promise.all(promisedPRs)
  }

  /**
   * Invokes the merging of all the given pull-requests
   * @param {*} context 
   * @param {*} prs pull-requests to merge
   * @returns a promise containing an array of PR-keys mapped to merge-invocation-response
   */
  function mergePRs(context: Context, prs: Array<PullRequest>): Promise<Array<PullRequest>> {
    const mergeInvocations = prs.map(pr => {
      if(pr.shouldMerge())
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