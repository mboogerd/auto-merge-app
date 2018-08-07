import { Context } from 'probot'
import { WebhookPayloadWithRepository } from 'probot/lib/context'
import { PR } from './model'
import { Async } from './async'

export namespace Client {

    export function getPullRequestId(payload: WebhookPayloadWithRepository): PR.PrId {
      return {
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        number: payload.pull_request.number
      }
    }

    const numberFromRightRegex = /.*\/([0-9]+)/
    /**
     * @param payload The payload of a `checksuite` Github event
     * @returns an array of pull-request identifiers {owner, repo, number} involved in this payload
     */
    export function getPullRequestIDsFromCheckSuite(payload: WebhookPayloadWithRepository): Array<PR.PrId> {
      const repoName = payload.repository.name
      const owner = payload.repository.owner.login
      return payload.check_suite.pull_requests.map((prURL: string) => {
        // @ts-ignore
        return { owner: owner, repo: repoName, number: parseInt(numberFromRightRegex.exec(prURL)[1]) }
      })
    }
    
    /**
     * Retrieves a single pull-request by its id
     * @param context 
     * @param prID 
     */
    export function getPullRequest(context: Context, prID: PR.PrId): Promise<PR.PullRequest> {
      return context.github.pullRequests.get(prID).then(pr => new PR.PullRequest(prID, pr.data))
    }
    
    /**
     * Merge a single pull-request
     * @param context 
     * @param pr 
     */
    export async function mergePR(context: Context, pr: PR.PullRequest): Promise<PR.PullRequest> {
      return context.github.pullRequests
            .merge(pr.id)
            // `undefined` error if just passing this as a function literal
            .then(r => pr.registerMergeResult(r.data))
    }

    /**
     * Waits until the given PR can be merged or further monitoring can stop
     * @param context 
     * @param pr the pull request id to poll
     * @returns A Promise with the final PullRequest state
     * 
     * @deprecated FIXME: Remove once Ebay migrated to Github Enterprise 2.14!
     */
    export async function waitUntilActionable(context: Context, prId: PR.PrId) {
      return Async.repeatUntil(
        () => getPullRequest(context, prId),
        pr => pr.shouldMerge() || !pr.isAutoMergeEligible(),
        0, // These parameters should of course be externalized, but hey, temp fix
        300000) // schedule every 5 minutes
    }
}
