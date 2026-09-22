const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
;(async () => {
  await mongoose.connect('mongodb://localhost:27017/animal_planet')
  const u = await mongoose.connection.db.collection('users').findOne({ email: 'phase09fix@test.dev' })
  if (!u) { console.log('NO USER'); await mongoose.disconnect(); return }
  console.log('hash', u.password.slice(0, 20))
  console.log('match', await bcrypt.compare('password123', u.password))
  await mongoose.disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
