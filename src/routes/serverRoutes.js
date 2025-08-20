import express from 'express'
import { serverCheck } from '../controllers/serverController'
import router from '.'

router = express.Router()

router.post('/serverCheck', serverCheck)

export default router;