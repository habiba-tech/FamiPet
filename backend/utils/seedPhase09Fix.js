const mongoose = require('mongoose')
const User = require('../models/User')
const Breed = require('../models/Breed')
const Pet = require('../models/Pet')

async function main() {
  await mongoose.connect('mongodb://localhost:27017/animal_planet')
  await User.deleteOne({ email: 'phase09fix@test.dev' })
  const user = await User.create({
    name: 'Phase Fixer',
    email: 'phase09fix@test.dev',
    password: 'password123',
    role: 'user',
    isVerified: true,
  })
  await Pet.deleteMany({ owner: user._id })
  let breed = await Breed.findOne({ name: 'Golden Retriever', species: 'dog' })
  if (!breed) {
    breed = await Breed.create({ name: 'Golden Retriever', species: 'dog', details: '' })
  }
  const pet = await Pet.create({
    owner: user._id,
    name: 'Max',
    species: 'dog',
    breed: breed._id,
    gender: 'male',
    breedDetails: {},
    age: 4,
    weight: 26,
    image: '',
    status: 'available',
    petUid: `seed-${Date.now().toString(36)}-${String(user._id).slice(-8)}`,
  })
  console.log('USER', user._id, 'PET', pet._id, 'PETUID', pet.petUid)
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})