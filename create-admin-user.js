require('dotenv').config();
const path = require('path');
require('module-alias')({ base: path.resolve(__dirname, 'api') });
const bcrypt = require('bcryptjs');
const { connectDb } = require('./api/db');
const { User } = require('./api/db/models');

async function createAdminUser() {
  try {
    await connectDb();
    console.log('Connected to MongoDB');

    const email = 'admin@ornina.ai';
    const password = 'admin123'; // Change this to a secure password
    const name = 'Admin';

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`User with email ${email} already exists`);
      process.exit(0);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await User.create({
      provider: 'local',
      email,
      password: hashedPassword,
      name,
      username: email,
      emailVerified: true,
      role: 'ADMIN',
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      usageCount: {
        messages: 0,
        images: 0,
        videos: 0,
        codeGenerations: 0,
        designAnalyses: 0,
        lastReset: new Date(),
      },
    });

    console.log('\n✅ Admin user created successfully!');
    console.log('\nLogin credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('\n⚠️  Please change this password after first login!');
    console.log('\nUser details:');
    console.log('- Role:', user.role);
    console.log('- Subscription:', user.subscriptionTier);
    console.log('- Email Verified:', user.emailVerified);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  }
}

createAdminUser();
