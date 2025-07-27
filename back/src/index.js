import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import sequelize from './config/database.js'
import Message from './models/Order.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 4000

app.get('/api/orders', async (req, res) => {
  const messages = await Message.findAll()
  res.json(messages)
})

try {
  await sequelize.authenticate()
  console.log('✅ Connected to bbdd')

  await sequelize.sync()

  app.listen(PORT, () => {
    console.log(`🚀 Server running http://localhost:${PORT}`)
  })
} catch (error) {
  console.error('❌ Error at connecting to bbdd:', error)
}
