/**
 * Seed Data Script
 * Creates sample users, guests, and incidents for development and testing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/User');
const Guest = require('../src/models/Guest');
const Incident = require('../src/models/Incident');
const { USER_ROLES, INCIDENT_TYPES, INCIDENT_STATUS, GENDER_OPTIONS, BLOOD_GROUPS } = require('../src/config/constants');

/**
 * Sample data for seeding
 */
const sampleUsers = [
  {
    fullName: 'John Doe',
    dob: new Date('1990-05-15'),
    gender: GENDER_OPTIONS.MALE,
    phone: '+1234567890',
    email: 'john.doe@example.com',
    password: 'SecurePass123!',
    address: {
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      pincode: '10001'
    },
    bloodGroup: BLOOD_GROUPS.O_POSITIVE,
    medicalConditions: ['Diabetes Type 2'],
    allergies: ['Peanuts', 'Shellfish'],
    emergencyContacts: [
      {
        name: 'Jane Doe',
        relation: 'Spouse',
        phone: '+1234567891'
      }
    ],
    vehicles: [
      {
        vehicleNumber: 'ABC123',
        type: 'Car',
        model: 'Toyota Camry 2020'
      }
    ],
    insurance: {
      provider: 'HealthCare Plus',
      policyNumber: 'HC123456789',
      validTill: new Date('2025-12-31')
    },
    role: USER_ROLES.USER
  },
  {
    fullName: 'Dr. Sarah Wilson',
    dob: new Date('1985-08-22'),
    gender: GENDER_OPTIONS.FEMALE,
    phone: '+1234567892',
    email: 'sarah.wilson@hospital.com',
    password: 'HospitalPass456!',
    address: {
      street: '456 Medical Center Drive',
      city: 'Los Angeles',
      state: 'CA',
      pincode: '90210'
    },
    bloodGroup: BLOOD_GROUPS.A_NEGATIVE,
    medicalConditions: [],
    allergies: [],
    emergencyContacts: [
      {
        name: 'Michael Wilson',
        relation: 'Spouse',
        phone: '+1234567893'
      }
    ],
    vehicles: [
      {
        vehicleNumber: 'MED456',
        type: 'Car',
        model: 'Honda CR-V 2022'
      }
    ],
    insurance: {
      provider: 'Medical Professional Insurance',
      policyNumber: 'MPI987654321',
      validTill: new Date('2026-06-30')
    },
    role: USER_ROLES.HOSPITAL
  },
  {
    fullName: 'Admin User',
    dob: new Date('1980-01-01'),
    gender: GENDER_OPTIONS.MALE,
    phone: '+1234567894',
    email: 'admin@emergency-platform.com',
    password: 'AdminSecure789!',
    address: {
      street: '789 Admin Boulevard',
      city: 'Washington',
      state: 'DC',
      pincode: '20001'
    },
    bloodGroup: BLOOD_GROUPS.B_POSITIVE,
    medicalConditions: [],
    allergies: [],
    emergencyContacts: [
      {
        name: 'Emergency Contact',
        relation: 'Colleague',
        phone: '+1234567895'
      }
    ],
    vehicles: [],
    insurance: {
      provider: 'Government Health',
      policyNumber: 'GH555666777',
      validTill: new Date('2025-12-31')
    },
    role: USER_ROLES.ADMIN
  }
];

const sampleGuests = [
  {
    actionCount: 3,
    maxActions: 10,
    lastActiveAt: new Date()
  },
  {
    actionCount: 7,
    maxActions: 10,
    lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
  },
  {
    actionCount: 10,
    maxActions: 10,
    lastActiveAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
  }
];

const sampleIncidents = [
  {
    title: 'Car Accident on Highway 101',
    description: 'Multi-vehicle collision blocking two lanes. Emergency services needed immediately. Multiple injuries reported.',
    type: INCIDENT_TYPES.ACCIDENT,
    geoLocation: {
      type: 'Point',
      coordinates: [-122.4194, 37.7749] // San Francisco coordinates
    },
    media: [
      {
        type: 'image',
        url: 'https://example.com/accident-photo1.jpg'
      },
      {
        type: 'video',
        url: 'https://example.com/accident-video1.mp4'
      }
    ],
    status: INCIDENT_STATUS.REPORTED,
    upvotes: 15
  },
  {
    title: 'Building Fire Downtown',
    description: 'Large fire in commercial building. Smoke visible from several blocks away. Fire department on scene.',
    type: INCIDENT_TYPES.FIRE,
    geoLocation: {
      type: 'Point',
      coordinates: [-74.0060, 40.7128] // New York coordinates
    },
    media: [
      {
        type: 'image',
        url: 'https://example.com/fire-photo1.jpg'
      }
    ],
    status: INCIDENT_STATUS.VERIFIED,
    upvotes: 32
  },
  {
    title: 'Medical Emergency at Park',
    description: 'Person collapsed during morning jog. CPR being administered by bystanders. Ambulance requested.',
    type: INCIDENT_TYPES.MEDICAL,
    geoLocation: {
      type: 'Point',
      coordinates: [-118.2437, 34.0522] // Los Angeles coordinates
    },
    media: [],
    status: INCIDENT_STATUS.RESOLVED,
    upvotes: 8
  },
  {
    title: 'Earthquake Damage Report',
    description: 'Structural damage to residential building after 5.2 earthquake. Residents evacuated safely.',
    type: INCIDENT_TYPES.NATURAL_DISASTER,
    geoLocation: {
      type: 'Point',
      coordinates: [-122.2711, 37.8044] // Oakland coordinates
    },
    media: [
      {
        type: 'image',
        url: 'https://example.com/earthquake-damage1.jpg'
      },
      {
        type: 'image',
        url: 'https://example.com/earthquake-damage2.jpg'
      }
    ],
    status: INCIDENT_STATUS.VERIFIED,
    upvotes: 23
  },
  {
    title: 'Robbery in Progress',
    description: 'Armed robbery at convenience store. Suspect fled on foot heading north. Police notified.',
    type: INCIDENT_TYPES.CRIME,
    geoLocation: {
      type: 'Point',
      coordinates: [-87.6298, 41.8781] // Chicago coordinates
    },
    media: [],
    status: INCIDENT_STATUS.REPORTED,
    upvotes: 5
  }
];

/**
 * Hash password for user creation
 */
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Create sample users
 */
const createUsers = async () => {
  console.log('👥 Creating sample users...');
  
  const createdUsers = [];
  
  for (const userData of sampleUsers) {
    try {
      // Hash password
      userData.password = await hashPassword(userData.password);
      
      // Create user
      const user = new User(userData);
      const savedUser = await user.save();
      createdUsers.push(savedUser);
      
      console.log(`✅ Created user: ${userData.email} (${userData.role})`);
    } catch (error) {
      if (error.code === 11000) {
        console.log(`⚠️ User already exists: ${userData.email}`);
        // Find existing user
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
          createdUsers.push(existingUser);
        }
      } else {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }
  }
  
  return createdUsers;
};

/**
 * Create sample guests
 */
const createGuests = async () => {
  console.log('👤 Creating sample guests...');
  
  const createdGuests = [];
  
  for (const guestData of sampleGuests) {
    try {
      const guest = new Guest(guestData);
      const savedGuest = await guest.save();
      createdGuests.push(savedGuest);
      
      console.log(`✅ Created guest: ${savedGuest.guestId} (${savedGuest.actionCount}/${savedGuest.maxActions} actions)`);
    } catch (error) {
      console.error('❌ Error creating guest:', error.message);
    }
  }
  
  return createdGuests;
};

/**
 * Create sample incidents
 */
const createIncidents = async (users, guests) => {
  console.log('🚨 Creating sample incidents...');
  
  const createdIncidents = [];
  
  for (let i = 0; i < sampleIncidents.length; i++) {
    try {
      const incidentData = { ...sampleIncidents[i] };
      
      // Randomly assign reporter (user or guest)
      const isUserReporter = Math.random() > 0.5;
      
      if (isUserReporter && users.length > 0) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        incidentData.reportedBy = {
          userType: 'user',
          userId: randomUser._id
        };
      } else if (guests.length > 0) {
        const randomGuest = guests[Math.floor(Math.random() * guests.length)];
        incidentData.reportedBy = {
          userType: 'guest',
          guestId: randomGuest._id
        };
      }
      
      // Add some upvotes with random users/guests
      const upvotedBy = [];
      const numUpvotes = Math.min(incidentData.upvotes, users.length + guests.length);
      
      for (let j = 0; j < numUpvotes; j++) {
        const isUserUpvote = Math.random() > 0.5;
        
        if (isUserUpvote && users.length > 0) {
          const randomUser = users[Math.floor(Math.random() * users.length)];
          upvotedBy.push({
            userType: 'user',
            userId: randomUser._id,
            upvotedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in last week
          });
        } else if (guests.length > 0) {
          const randomGuest = guests[Math.floor(Math.random() * guests.length)];
          upvotedBy.push({
            userType: 'guest',
            guestId: randomGuest._id,
            upvotedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
          });
        }
      }
      
      incidentData.upvotedBy = upvotedBy;
      
      const incident = new Incident(incidentData);
      const savedIncident = await incident.save();
      createdIncidents.push(savedIncident);
      
      console.log(`✅ Created incident: ${incidentData.title} (${incidentData.type}, ${incidentData.status})`);
    } catch (error) {
      console.error(`❌ Error creating incident:`, error.message);
    }
  }
  
  return createdIncidents;
};

/**
 * Main seeding function
 */
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emergency-incident-platform');
    console.log('✅ Connected to MongoDB');
    
    // Create sample data
    const users = await createUsers();
    const guests = await createGuests();
    const incidents = await createIncidents(users, guests);
    
    console.log('\n📊 Seeding Summary:');
    console.log(`👥 Users created: ${users.length}`);
    console.log(`👤 Guests created: ${guests.length}`);
    console.log(`🚨 Incidents created: ${incidents.length}`);
    
    console.log('\n🎯 Sample API Usage:');
    console.log('Health Check: GET http://localhost:3000/health');
    console.log('Create Guest: POST http://localhost:3000/api/guest/create');
    console.log('List Incidents: GET http://localhost:3000/api/incidents');
    console.log('Register User: POST http://localhost:3000/api/user/register');
    
    console.log('\n📋 Sample Login Credentials:');
    console.log('Regular User: john.doe@example.com / SecurePass123!');
    console.log('Hospital User: sarah.wilson@hospital.com / HospitalPass456!');
    console.log('Admin User: admin@emergency-platform.com / AdminSecure789!');
    
    console.log('\n✅ Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

/**
 * Clear all data (for development reset)
 */
const clearDatabase = async () => {
  try {
    console.log('🗑️ Clearing database...');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emergency-incident-platform');
    console.log('✅ Connected to MongoDB');
    
    await User.deleteMany({});
    await Guest.deleteMany({});
    await Incident.deleteMany({});
    
    console.log('✅ Database cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Command line interface
const command = process.argv[2];

if (command === 'clear') {
  clearDatabase();
} else {
  seedDatabase();
}