/* global describe it */

const {expect} = require('chai')
const {clientIp, email} = require('../rateLimit')

const fakeReq = (headers, ip, body) => ({
  get: name => headers[name],
  ip,
  body: body || {}
})

describe('Rate limit keys', () => {
  describe('clientIp', () => {
    it('uses the X-Real-IP header when present', () => {
      expect(clientIp(fakeReq({'X-Real-IP': '203.0.113.7'}, '100.64.0.2'))).to.equal('203.0.113.7')
    })

    it('falls back to req.ip', () => {
      expect(clientIp(fakeReq({}, '127.0.0.1'))).to.equal('127.0.0.1')
    })
  })

  describe('email', () => {
    it('keys on the email in the body', () => {
      expect(email(fakeReq({}, '127.0.0.1', {email: 'cody@puppybook.com'}))).to.equal('email:cody@puppybook.com')
    })
  })
})
