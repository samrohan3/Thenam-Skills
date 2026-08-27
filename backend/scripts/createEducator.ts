import { admin } from '../src/config/firebaseAdmin';

async function createEducator() {
  const email = 'jayamurugan@thenam.edu';
  const password = 'thenam@12345';
  const name = 'Jayamurugan';

  try {
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log(`User already exists in Auth with UID: ${userRecord.uid}`);
      // Optionally update password if needed
      await admin.auth().updateUser(userRecord.uid, { password });
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: name,
        });
        console.log(`Created new user in Auth with UID: ${userRecord.uid}`);
      } else {
        throw error;
      }
    }

    const firestore = admin.firestore();
    const profileRef = firestore.collection('users').doc(userRecord.uid);
    
    await profileRef.set({
      id: userRecord.uid,
      name,
      email,
      role: 'admin', // Giving max access as requested
      headline: 'Senior Educator & AI Specialist',
      college: 'THENAM Campus',
      department: 'Computer Science',
      yearOfStudy: 'Faculty',
      location: 'Chennai, India',
      avatar: 'https://cdn.phototourl.com/free/2026-08-26-5659434f-46e0-4faa-8391-72dfeefaa208.jpg',
      coverImage: '',
      bio: 'Educator shaping the future of AI.',
      skills: ['Machine Learning', 'AI', 'Mentorship'],
      interests: [],
      metrics: {
        coursesCompleted: 0,
        certificatesCount: 0,
        projectsCount: 0,
        networkCount: 0,
        xpPoints: 0,
        streakDays: 0,
        globalRank: 1
      },
      journey: [],
      profileCompleted: true,
      isOnboardingCompleted: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`Successfully created/updated Firestore profile for UID: ${userRecord.uid}`);
    process.exit(0);
  } catch (error) {
    console.error('Error creating educator:', error);
    process.exit(1);
  }
}

createEducator();
