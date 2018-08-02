const { Application } = require('probot')
// Requiring our app implementation
const prMergeBot = require('../lib/index')
const { Async } = require('../lib/async')
// Test data
const checksuiteSuccessPayload = require('./fixtures/checksuite_success.json')
const checksuiteNonSuccessPayload = require('./fixtures/checksuite_non_success.json')
const getPRMergePayload = require('./fixtures/get-pr-merge.json')
const getPRNonMergePayload = require('./fixtures/get-pr-non-merge.json')
const mergeSuccessPayload = require('./fixtures/merge-success.json')
const prEligibleClosedPayload = require('./fixtures/pr-eligible-closed.json')
const prEligibleOpenedPayload = require('./fixtures/pr-eligible-opened.json')

describe('Pull Request Merger', () => {
  let app, github

  function getPullRequestMock () {
    return jest.fn(pullRequestsGetParams => {
      if (pullRequestsGetParams.number === 1) return Promise.resolve({data: getPRMergePayload})
      else return Promise.resolve({data: getPRNonMergePayload})
    })
  }

  function mergePRMock () { return jest.fn(_ => Promise.resolve({data: mergeSuccessPayload})) }

  beforeEach(() => {
    // Default mock
    github = {
      pullRequests: {
        get: getPullRequestMock(),
        merge: mergePRMock()
      }
    }
    initializeApp(github)
  })

  function initializeApp (github) {
    app = new Application()
    // Initialize the app based on the code from index.js
    app.load(prMergeBot)
    // Passes the mocked out GitHub API into out app instance
    app.auth = () => Promise.resolve(github)
  }

  test('doesn\'t do anything with checksuite events that indicate non-success', async () => {
    // Simulates delivery of a checksuite webhook
    await app.receive({
      event: 'checksuite',
      payload: checksuiteNonSuccessPayload
    })

    // We shouldn't be interested in pull-requests whose checksuite did not result in success
    expect(github.pullRequests.get).not.toHaveBeenCalled()
  })

  test('inspects PRs (for label "merge when ready") if checksuite completed successfully', async () => {
    // Simulates delivery of a checksuite webhook
    await app.receive({
      event: 'checksuite',
      payload: checksuiteSuccessPayload
    })

    expect(github.pullRequests.get).toBeCalledWith({ owner: 'github', repo: 'hello-world', number: 1 })
    expect(github.pullRequests.get).toBeCalledWith({ owner: 'github', repo: 'hello-world', number: 2 })
  })

  test('merge PRs with label "merge when ready" if checksuite completed successfully', async () => {
    // Simulates delivery of a checksuite webhook
    await app.receive({
      event: 'checksuite',
      payload: checksuiteSuccessPayload
    })

    expect(github.pullRequests.merge).toBeCalledWith({ owner: 'github', repo: 'hello-world', number: 1 })
    expect(github.pullRequests.merge).not.toBeCalledWith({ owner: 'github', repo: 'hello-world', number: 2 })
  })
})
