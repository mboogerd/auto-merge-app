import { AnyResponse } from '@octokit/rest'

export namespace PR {

  export const actionCompleted = 'completed'
  export const actionReopened = 'reopened'
  export const actionOpened = 'opened'
  export const conclusionSuccess = 'success'
  export const mergeWhenReady = 'merge when ready'

  export declare type PrId = {
    readonly owner: string
    readonly repo: string
    readonly number: number
  }

  export declare type Label = {
    readonly name: string
    readonly number: number
  }

  export enum MergeResult {
    Merged = "merged",        // Is already merged
    Unmerged = "unmerged",    // Isn't merged yet (and if eligible, we will)
    Failed = "failed",        // Attempted to merge and failed
    Success = "success"       // Attempted to merge and succeeded
  }

  // union type because there is no automatic string=>enum mapping in Typescript...
  declare type MergeableState =
    "dirty" |     // Merge conflict. Merging is blocked.
    "unknown" |   // Mergeability was not checked yet. Merging is blocked.
    "blocked" |   // Failing/missing required status check.  Merging is blocked.
    "behind" |    // Head branch is behind the base branch. Only if required status checks is enabled but loose policy is not. Merging is blocked.
    "unstable" |  // Failing/pending commit status that is not part of the required status checks. Merging is still allowed.
    "has_hooks" | // GitHub Enterprise only, if a repo has custom pre-receive hooks. Merging is allowed.
    "clean"       // No conflicts, everything good. Merging is allowed.

  export class PullRequest {
    readonly id: PrId
    readonly labels: Array<Label>
    readonly mergeable: boolean
    readonly mergeableState?: MergeableState
    readonly open: boolean
    merged: MergeResult

    constructor(id: PrId, anyResponse: AnyResponse) {
      this.id = id
      // @ts-ignore
      this.labels = anyResponse['labels'] || []
      // @ts-ignore
      this.mergeable = anyResponse['mergeable']
      // @ts-ignore
      this.mergeableState = anyResponse['mergeable_state']
      // @ts-ignore
      if (anyResponse['merged'])
        this.merged = MergeResult.Merged
      else
        this.merged = MergeResult.Unmerged
      // @ts-ignore
      this.open = anyResponse['state'] == "open"
    }

    isAutoMergeEligible(): boolean {
      return this.labels.some(l => l.name.toLowerCase() == mergeWhenReady)
          && this.merged == MergeResult.Unmerged
          && this.open
    }

    isClean(): boolean { return this.mergeableState == "clean" && this.mergeable }

    shouldMerge(): boolean {
      return this.isAutoMergeEligible() && this.isClean()
    }

    shouldScheduleForMerge(): boolean {
      return this.isAutoMergeEligible() && !this.isClean()
    }

    registerMergeResult(result: AnyResponse): PullRequest {
      // @ts-ignore
      if (result.merged == true)
        this.merged = MergeResult.Success
      else
        this.merged = MergeResult.Failed

      return this
    }

    public toString = (): string => {
      return `PullRequest(${this.id.owner}:${this.id.repo}/${this.id.number}) [
- status: ${this.merged}
- eligible: ${this.isAutoMergeEligible()}
- clean: ${this.isClean()}
- open: ${this.open}
- mergeableState: ${this.mergeableState}
- labels: ${JSON.stringify(this.labels.map(l => l.name))}
]`
    }
  }
}
