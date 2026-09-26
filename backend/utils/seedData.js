const mongoose = require('mongoose');
const User = require('../models/User');
const Breed = require('../models/Breed');
const Pet = require('../models/Pet');
const Veterinarian = require('../models/Veterinarian');
const CommunityPost = require('../models/CommunityPost');
const LostFound = require('../models/LostFound');
const Appointment = require('../models/Appointment');
const Reminder = require('../models/Reminder');
const HealthRecord = require('../models/HealthRecord');
const Vaccination = require('../models/Vaccination');
const Adoption = require('../models/Adoption');
const Notification = require('../models/Notification');
require('dotenv').config();
const logger = require('./logger');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/animal_planet');
    logger.info('Connected to MongoDB');

    await Promise.all([
      User.deleteMany(),
      Breed.deleteMany(),
      Pet.deleteMany(),
      Veterinarian.deleteMany(),
      CommunityPost.deleteMany(),
      LostFound.deleteMany(),
      Appointment.deleteMany(),
      Reminder.deleteMany(),
      HealthRecord.deleteMany(),
      Vaccination.deleteMany(),
      Adoption.deleteMany(),
      Notification.deleteMany(),
    ]);

    const admin = await User.create({ name: 'Admin User', email: 'admin@animalplanet.com', password: 'admin123', role: 'admin', isVerified: true });

    const user = await User.create({ name: 'Demo User', email: 'user@example.com', password: 'user123', role: 'user', isVerified: true });

    const breeds = await Breed.insertMany([
      { name: 'Golden Retriever', species: 'dog', origin: 'Scotland', lifespan: '10-12 years', weightRange: '25-34 kg', heightRange: '51-61 cm', temperament: ['Friendly', 'Intelligent', 'Devoted', 'Gentle'], exerciseRequirements: 'High - needs 1-2 hours daily exercise', groomingGuide: 'Brush 2-3 times per week, daily during shedding', commonDiseases: ['Hip dysplasia', 'Elbow dysplasia', 'Cataracts', 'Heart issues'], suitableEnvironment: 'House with yard, active family', description: 'A friendly, reliable, and trustworthy dog that makes an excellent family pet.' },
      { name: 'Persian Cat', species: 'cat', origin: 'Iran (Persia)', lifespan: '12-17 years', weightRange: '3-6 kg', heightRange: '25-30 cm', temperament: ['Gentle', 'Quiet', 'Affectionate', 'Lazy'], exerciseRequirements: 'Low - indoor play sufficient', groomingGuide: 'Daily brushing required due to long coat', commonDiseases: ['Polycystic kidney disease', 'Respiratory issues', 'Eye conditions'], suitableEnvironment: 'Indoor, calm household', description: 'A luxurious long-haired cat known for its sweet and gentle personality.' },
      { name: 'Labrador Retriever', species: 'dog', origin: 'Canada', lifespan: '10-14 years', weightRange: '25-36 kg', heightRange: '55-62 cm', temperament: ['Outgoing', 'Even tempered', 'Gentle', 'Intelligent'], exerciseRequirements: 'High - very active breed', groomingGuide: 'Weekly brushing, more during shedding season', commonDiseases: ['Hip dysplasia', 'Obesity', 'Ear infections'], suitableEnvironment: 'Active family, house with yard', description: "America's most popular dog breed, known for being friendly and outgoing." },
      { name: 'Siamese Cat', species: 'cat', origin: 'Thailand', lifespan: '15-20 years', weightRange: '3-5 kg', heightRange: '20-25 cm', temperament: ['Vocal', 'Social', 'Intelligent', 'Playful'], exerciseRequirements: 'Moderate - interactive play needed', groomingGuide: 'Weekly brushing, minimal shedding', commonDiseases: ['Respiratory issues', 'Dental problems', 'Amyloidosis'], suitableEnvironment: 'Indoor, social household', description: 'A vocal and social cat that forms strong bonds with its owners.' },
    ]);

    const pets = await Pet.insertMany([
      { owner: admin._id, breed: breeds[0]._id, name: 'Buddy', species: 'dog', gender: 'male', age: 2, weight: 30, color: 'Golden', vaccinated: true, adopted: false, status: 'available', description: 'Friendly and energetic Golden Retriever looking for a loving home. Great with kids!', images: ['https://images.unsplash.com/photo-1552053831-71594a27632d?w=400'] },
      { owner: admin._id, breed: breeds[1]._id, name: 'Luna', species: 'cat', gender: 'female', age: 1, weight: 4, color: 'White', vaccinated: true, adopted: false, status: 'available', description: 'Beautiful Persian cat with a calm demeanor. Perfect lap cat!', images: ['https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400'] },
      { owner: user._id, breed: breeds[2]._id, name: 'Max', species: 'dog', gender: 'male', age: 3, weight: 32, color: 'Chocolate', vaccinated: true, adopted: false, status: 'available', description: 'Loyal and loving Labrador who loves swimming and playing fetch.', images: ['https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=400'] },
    ]);

    const veterinarians = await Veterinarian.insertMany([
      { name: 'Dr. Sarah Johnson', email: 'sarah.johnson@vet.com', phone: '+1-555-0101', specialization: ['Small Animals', 'Surgery', 'Dermatology'], qualifications: ['DVM', 'MS Veterinary Surgery'], experience: 12, clinic: 'Paws & Claws Veterinary Clinic', address: '123 Main Street', city: 'New York', rating: 4.8, availability: [{ day: 'Monday', startTime: '09:00', endTime: '17:00', isAvailable: true }, { day: 'Tuesday', startTime: '09:00', endTime: '17:00', isAvailable: true }, { day: 'Wednesday', startTime: '09:00', endTime: '17:00', isAvailable: true }], consultationFee: 75 },
      { name: 'Dr. Michael Chen', email: 'michael.chen@vet.com', phone: '+1-555-0102', specialization: ['Exotic Animals', 'Avian Medicine', 'Internal Medicine'], qualifications: ['DVM', 'PhD Avian Medicine'], experience: 8, clinic: 'Exotic Pet Care Center', address: '456 Oak Avenue', city: 'Los Angeles', rating: 4.9, availability: [{ day: 'Monday', startTime: '10:00', endTime: '18:00', isAvailable: true }, { day: 'Thursday', startTime: '10:00', endTime: '18:00', isAvailable: true }, { day: 'Friday', startTime: '10:00', endTime: '18:00', isAvailable: true }], consultationFee: 90 },
    ]);

    await CommunityPost.insertMany([
      { user: user._id, title: 'Tips for introducing a new puppy to your home', content: 'When bringing a new puppy home, keep the first days calm, set up a dedicated sleeping area, and start crate training early. Consistency wins!', category: 'pet-care', image: '', likes: [admin._id], comments: [{ user: admin._id, text: 'Great advice, thanks for sharing!' }] },
      { user: admin._id, title: 'How to tell if your cat is stressed', content: 'Look out for excessive grooming, hiding, changes in appetite, or litter box avoidance. A quiet routine and vertical spaces help a lot.', category: 'health', image: '', likes: [user._id], comments: [] },
      { user: user._id, title: 'Best walking routes for dogs this season', content: 'Early mornings and evenings are cooler. Avoid hot pavement - if it is too hot for your hand, it is too hot for paws.', category: 'general', image: '', likes: [], comments: [] },
    ]);

    await LostFound.insertMany([
      { user: user._id, type: 'lost', petName: 'Coco', species: 'dog', breed: 'Beagle', gender: 'male', color: 'Brown and white', description: 'Lost near the downtown park this morning. Wearing a blue collar with a bell. Very friendly.', location: 'Downtown Park', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), contactName: 'Demo User', contactPhone: '+1-555-0201', images: [], status: 'active' },
      { user: admin._id, type: 'found', petName: 'Milo', species: 'cat', breed: 'Tabby', gender: 'male', color: 'Gray', description: 'Found a friendly gray cat near the Riverside shopping center. Currently safe with us, no chip found.', location: 'Riverside Shopping Center', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), contactName: 'Admin User', contactPhone: '+1-555-0202', images: [], status: 'active' },
    ]);

    await HealthRecord.insertMany([
      { user: user._id, pet: pets[2]._id, diagnosis: 'Routine checkup', treatment: 'Full physical, teeth cleaning recommended', doctor: 'Dr. Sarah Johnson', hospital: 'Paws & Claws Veterinary Clinic', visitDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), nextVisit: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), notes: 'Healthy weight, annual booster due next month.' },
    ]);

    await Vaccination.insertMany([
      { user: user._id, pet: pets[2]._id, vaccineName: 'Rabies Booster', doseNumber: 2, vaccinationDate: new Date(Date.now() - 320 * 24 * 60 * 60 * 1000), nextDueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), veterinarian: 'Dr. Sarah Johnson', hospital: 'Paws & Claws Veterinary Clinic', status: 'Pending' },
    ]);

    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 3);

    await Appointment.create({
      user: user._id,
      pet: pets[2]._id,
      veterinarian: veterinarians[0]._id,
      date: reminderDate,
      time: '10:30',
      type: 'checkup',
      status: 'confirmed',
      symptoms: 'Annual booster vaccination',
      notes: 'Bring vaccination records.',
      fee: veterinarians[0].consultationFee,
    });

    await Reminder.insertMany([
      { user: user._id, pet: pets[2]._id, title: 'Morning walk', type: 'exercise', description: 'Daily morning walk around the park.', date: new Date(), time: '07:00', frequency: 'daily', isActive: true, isCompleted: false },
      { user: user._id, pet: pets[2]._id, title: 'Heartworm medication', type: 'medicine', description: 'Monthly heartworm prevention for Max.', date: reminderDate, time: '20:00', frequency: 'monthly', isActive: true, isCompleted: false },
    ]);

    await Adoption.create({
      pet: pets[0]._id,
      user: user._id,
      fullName: 'Demo User',
      phone: '+1-555-0201',
      address: '123 Demo Street, New York',
      occupation: 'Software Developer',
      experienceWithPets: '3 years with Max, a Labrador.',
      reasonForAdoption: 'Looking for a playful companion for Max and our family.',
      status: 'Pending',
    });

    await Notification.create([
      { user: user._id, title: 'Welcome to FamiPet!', message: 'Your account is ready. Start by adding your pet and booking an appointment.', type: 'system', isRead: false },
      { user: user._id, title: 'Vaccination due soon', message: 'Max has a rabies booster due in the next few days.', type: 'vaccination', isRead: false },
    ]);

    logger.info('Seed data created successfully!');
    logger.info('Admin: admin@animalplanet.com / admin123');
    logger.info('User: user@example.com / user123');
    process.exit(0);
  } catch (error) {
    logger.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();