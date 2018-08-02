import { AnyResponse } from '@octokit/rest'

export namespace PR {

  export const actionCompleted = 'completed'
  export const conclusionSuccess = 'success'
  export const mergeWhenReady = 'merge when ready'

  export declare class PrId {
    readonly owner: string
    readonly repo: string
    readonly number: number
  }

  export declare class Label {
    name: string
    number: number
  }

  export enum MergeResult {
    Merged = "merged",        // Is already merged
    Unmerged = "unmerged",    // Isn't merged yet (and if eligible, we will)
    Failed = "failed",        // Attempted to merge and failed
    Success = "success"       // Attempted to merge and succeeded
  }

  export class PullRequest {
    id: PrId
    labels: Array<Label>
    mergeable: boolean
    merged: MergeResult

    constructor(id: PrId, anyResponse: AnyResponse) {
      this.id = id
      // @ts-ignore
      this.labels = anyResponse.labels
      // @ts-ignore
      this.mergeable = anyResponse.mergeable
      // @ts-ignore
      if (anyResponse.merged)
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
      if (result.merged == true)
        this.merged = MergeResult.Success
      else
        this.merged = MergeResult.Failed

      return this
    }

    public toString = (): string => {
      const baseMsg = `PullRequest(${this.id.owner}:${this.id.repo}/${this.id.number}) merge status: ${this.merged}`
      if (this.merged == MergeResult.Unmerged)
        return baseMsg + ` [eligible: ${this.shouldMerge()}]`
      else
        return baseMsg
    }
  }
}
