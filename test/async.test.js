const { Async } = require('../lib/async')

describe('Async', () => {
  test('repeatUntil should work', async() => {
    var count = 0
    const intStream = jest.fn(() => {
      count += 1
      return Promise.resolve(count)
    })

    await Async.repeatUntil(intStream, i => i === 3, 10)
    expect(intStream).toHaveBeenCalledTimes(3)
  })
})
