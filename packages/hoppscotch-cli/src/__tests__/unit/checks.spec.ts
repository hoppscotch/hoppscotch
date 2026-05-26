import { describe, test, expect } from 'vitest'
import { CommanderError } from 'commander'
import { 
  hasProperty, 
  isHoppCLIError, 
  isSafeCommanderError 
} from '../../utils/checks'

describe('CLI Type Guard Utilities (checks.ts)', () => {
  
  describe('hasProperty', () => {
    test('should return true if the property exists on the object', () => {
      const target = { code: 'ERR_NOT_FOUND' }
      expect(hasProperty(target, 'code')).toBe(true)
    })

    test('should return false if the property does not exist', () => {
      const target = { message: 'Something went wrong' }
      expect(hasProperty(target, 'code')).toBe(false)
    })
  })

  describe('isHoppCLIError', () => {
    test('should return true for a valid HoppCLIError object', () => {
      const validError = { code: 'INVALID_ARGUMENT', message: 'Bad input' }
      expect(isHoppCLIError(validError)).toBe(true)
    })

    test('should return false if the input is a primitive string instead of an object', () => {
      expect(isHoppCLIError('This is just a string error')).toBe(false)
    })

    test('should return false if the code property exists but is not a string', () => {
      const invalidErrorCode = { code: 404 } 
      expect(isHoppCLIError(invalidErrorCode)).toBe(false)
    })
  })

  describe('isSafeCommanderError', () => {
    test('should return true for a CommanderError with exit code 0', () => {
      const safeError = new CommanderError(0, 'commander.help', '(output)')
      expect(isSafeCommanderError(safeError)).toBe(true)
    })

    test('should return false for a CommanderError with a non-zero exit code', () => {
      const fatalError = new CommanderError(1, 'commander.unknownOption', 'error')
      expect(isSafeCommanderError(fatalError)).toBe(false)
    })
  })
})