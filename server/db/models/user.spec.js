/* global describe beforeEach it */

const {expect} = require('chai')
const db = require('../index')
const User = db.model('user')

describe('User model', () => {
  beforeEach(() => {
    return db.sync({force: true})
  })

  describe('instanceMethods', () => {
    describe('correctPassword', () => {
      let cody

      beforeEach(() => {
        return User.create({
          email: 'cody@puppybook.com',
          password: 'bonesbones'
        })
          .then(user => {
            cody = user
          })
      })

      it('returns true if the password is correct', () => {
        return cody.correctPassword('bonesbones')
          .then(result => expect(result).to.be.equal(true))
      })

      it('returns false if the password is incorrect', () => {
        return cody.correctPassword('bonezbonez')
          .then(result => expect(result).to.be.equal(false))
      })

      it('stores a bcrypt hash, not the password', () => {
        expect(cody.password()).to.match(/^\$2[aby]\$1\d\$/)
      })

      it('leaves the password out of JSON', () => {
        expect(JSON.stringify(cody)).to.not.include(cody.password())
      })
    }) // end describe('correctPassword')
  }) // end describe('instanceMethods')
}) // end describe('User model')
