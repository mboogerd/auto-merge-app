/**
 * This is the entry point for your Probot App.
 * @param {import('probot').Application} app - Probot's Application class.
 */
module.exports = app => {

  const actionCompleted = 'completed'
  const conclusionSuccess = 'success'
  const mergeWhenReady = 'merge when ready'
  const numberFromRightRegex = /.*\/([0-9]+)/

  // Main route, handle checksuite events
  app.on('checksuite', async context => {
    const action = context.payload.action
    const check_suite = context.payload.check_suite

    if (action == actionCompleted && check_suite.conclusion == conclusionSuccess) {
      app.log(`Processing checksuite event for pull requests ${check_suite.pull_requests}`)
      const mergeResults = await mergeAllEligible(context, getPullRequestIDs(context.payload))
      reportMergeResults(mergeResults)
    } else {
      app.log(`Ignoring checksuite event {action: ${action}, conclusion: ${conclusionSuccess}}`)
    }
  })

  /**
   * @param {*} payload
   * @returns an array of pull-request identifiers {owner, repo, number} involved in this payload
   */
  function getPullRequestIDs(payload) {
    const repoName = payload.repository.full_name
    const owner = payload.repository.owner.login
    return payload.check_suite.pull_requests.map(prURL => {
      return {owner: owner, repo: repoName, number: parseInt(numberFromRightRegex.exec(prURL)[1])}
    })
  }

  /**
   * Merges each pull-request that is eligible for auto-merging
   * @param {*} context 
   * @param {*} prIDs 
   */
  async function mergeAllEligible(context, prIDs) {
      // Get the data for each pr-id
      const prs = await getPullRequests(context, prIDs)
      // Check which ones are eligible for merging
      const prsToMerge = selectMergeEligiblePRs(prs)
      // Merge just the eligible ones
      return mergePRs(context, prsToMerge)
  }

  /**
   * get all the pull requests given their identifiers
   * @param {*} context 
   * @param {*} prIDs 
   */
  function getPullRequests(context, prIDs) {
    const promisedPRs = prIDs.map(prID => 
      context.github.pullRequests.get(prID).then(pr => [prID, pr])
    )
    return Promise.all(promisedPRs)
  }

  /**
   * @param {*} pr The pull request to check for merge-eligibility
   * @returns true if this should be merged, false otherwise
   */
  function shouldMergePR(pr) {
    return pr.labels.some(l => l.name.toLowerCase() == mergeWhenReady) && pr.mergeable
  }

  /**
   * @param {[[[pull-request-key], [pull-request-value]]]}
   * @returns An pull-request-id array of 
   */
  function selectMergeEligiblePRs(prIDtoPRarray) {
    return prIDtoPRarray.filter(keyPR => shouldMergePR(keyPR[1])).map(keyPR => keyPR[0])
  }

  /**
   * Invokes the merging of all the given pull-requests
   * @param {*} context 
   * @param {*} prIDs identifiers of pull-requests to merge
   * @returns a promise containing an array of PR-keys mapped to merge-invocation-response
   */
  function mergePRs(context, prIDs) {
    const mergeInvocations = prIDs.map(prID =>
      context.github.pullRequests
      .merge(prID)
      .then(res => [prID, res])
    )
    return Promise.all(mergeInvocations)
  }

  function reportMergeResults(prIdToResult) {
    prIdToResult.forEach(element => {
      app.log(`Merge result for ${element[0]} is ${element[1].message}`)
    });
  }
}