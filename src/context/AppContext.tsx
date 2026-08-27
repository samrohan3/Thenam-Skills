import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import confetti from 'canvas-confetti';
import {
  StudentProfile,
  Course,
  Certificate,
  Project,
  EventItem,
  ActivityItem,
  NetworkConnection,
  NotificationItem,
  Conversation,
  CommunityGroup,
  AppSettings,
  ActivityType
} from '../types';
import { DEMO_USER } from '../mock/students';
import { INITIAL_COURSES } from '../mock/courses';
import { INITIAL_CERTIFICATES } from '../mock/certificates';
import { INITIAL_ACTIVITIES } from '../mock/activities';
import { INITIAL_PROJECTS } from '../mock/projects';
import { INITIAL_EVENTS } from '../mock/events';
import { INITIAL_CONNECTIONS } from '../mock/connections';
import { INITIAL_NOTIFICATIONS } from '../mock/notifications';
import { INITIAL_CONVERSATIONS } from '../mock/messages';
import { INITIAL_COMMUNITIES } from '../mock/communities';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import { socket } from '../services/socket';
import { createEventInFirestore, subscribeToEvents, toggleEventRegistration as toggleEventRegistrationInFirestore, deleteEvent as deleteEventInFirestore } from '../firebase/firestore';

interface AutomationPayload {
  title: string;
  courseName: string;
  certificateId: string;
  skillsAdded: string[];
  xpGained: number;
}

interface AppContextType {
  currentUser: StudentProfile;
  updateCurrentUser: (updated: Partial<StudentProfile>) => void;
  addSkillToProfile: (skill: string) => void;
  removeSkillFromProfile: (skill: string) => void;
  
  // Courses
  courses: Course[];
  enrollInCourse: (courseId: string) => void;
  toggleCourseBookmark: (courseId: string) => void;
  completeCourseModule: (courseId: string, moduleId: string) => void;
  
  // Automated Experience Pipeline
  triggerCourseCompletionAutomation: (courseId: string) => Promise<Certificate | null>;
  activeAutomationModal: AutomationPayload | null;
  closeAutomationModal: () => void;
  
  // Activities / Feed
  activities: ActivityItem[];
  isFeedLoading: boolean;
  createActivity: (activity: Omit<ActivityItem, 'id' | 'timestamp' | 'likesCount' | 'isLiked' | 'commentsCount' | 'comments' | 'sharesCount'>) => void;
  toggleLikeActivity: (activityId: string) => void;
  addCommentToActivity: (activityId: string, text: string) => void;
  toggleSaveActivity: (activityId: string) => void;
  deleteActivity: (activityId: string) => void;
  
  // Certificates
  certificates: Certificate[];
  getCertificateById: (id: string) => Certificate | undefined;
  
  // Projects
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'likesCount' | 'viewsCount' | 'createdAt'>) => void;
  updateProject: (id: string, updated: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  toggleLikeProject: (id: string) => void;
  
  // Events
  events: EventItem[];
  toggleEventRegistration: (eventId: string) => void;
  
  // Network Connections
  connections: NetworkConnection[];
  toggleConnectionStatus: (connectionId: string) => void;
  
  // Notifications
  notifications: NotificationItem[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  unreadNotificationsCount: number;
  
  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  sendMessage: (conversationId: string, text: string) => void;
  
  // Communities
  communities: CommunityGroup[];
  toggleJoinCommunity: (communityId: string) => void;
  
  // Settings
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // New Features
  createEvent: (eventData: Omit<EventItem, 'id' | 'registeredCount' | 'isRegistered'>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  toggleFollowEducator: (educatorId: string) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoAddCompletedCourses: true,
  autoCreateAchievementActivity: true,
  showAchievementsInFeed: true,
  autoAddWorkshopAttendance: true,
  autoAddWebinarActivity: true,
  askBeforePublishing: false,
  emailNotifications: true,
  networkVisibility: 'public',
  talentSearchDiscoverable: true,
  theme: 'light'
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUserProfile, refreshProfile } = useAuth();

  const currentUser = useMemo<StudentProfile>(() => {
    if (!currentUserProfile) return DEMO_USER;
    return {
      id: currentUserProfile.uid || currentUserProfile.id || '',
      name: currentUserProfile.name || '',
      headline: currentUserProfile.headline || `${currentUserProfile.year || 'Student'} - ${currentUserProfile.department || 'Engineering'}`,
      college: currentUserProfile.collegeName || currentUserProfile.college || 'DMI College of Engineering',
      department: currentUserProfile.department || '',
      yearOfStudy: currentUserProfile.year || currentUserProfile.yearOfStudy || '',
      location: currentUserProfile.collegeLocation 
        ? `${currentUserProfile.collegeLocation.city}, ${currentUserProfile.collegeLocation.state}` 
        : currentUserProfile.location || 'Chennai, India',
      avatar: currentUserProfile.photoURL || currentUserProfile.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
      coverImage: currentUserProfile.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      bio: currentUserProfile.bio || 'THENAM student building professional identity.',
      email: currentUserProfile.email || '',
      phone: currentUserProfile.phoneNumber || currentUserProfile.phone || '',
      githubUrl: currentUserProfile.githubURL || currentUserProfile.githubUrl || '',
      linkedinUrl: currentUserProfile.linkedinURL || currentUserProfile.linkedinUrl || '',
      skills: currentUserProfile.skills || [],
      interests: currentUserProfile.interests || [],
      metrics: currentUserProfile.metrics || {
        coursesCompleted: 0,
        certificatesCount: 0,
        projectsCount: 0,
        networkCount: 0,
        xpPoints: 0,
        streakDays: 0,
        globalRank: 100
      },
      journey: currentUserProfile.journey || [],
      profileCompleted: currentUserProfile.profileCompleted || false,
      isOnboardingCompleted: currentUserProfile.isOnboardingCompleted || false,
      role: currentUserProfile.role || 'student',
      dateOfBirth: currentUserProfile.dateOfBirth || '',
      collegeLocation: currentUserProfile.collegeLocation || { city: '', state: '', country: '' }
    };
  }, [currentUserProfile]);

  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem('thenam_courses');
    return saved ? JSON.parse(saved) : INITIAL_COURSES;
  });

  const [certificates, setCertificates] = useState<Certificate[]>(() => {
    const saved = localStorage.getItem('thenam_certificates');
    return saved ? JSON.parse(saved) : INITIAL_CERTIFICATES;
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState(true);

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('thenam_projects');
    return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
  });

  const [events, setEvents] = useState<EventItem[]>(() => {
    const saved = localStorage.getItem('thenam_events');
    return saved ? JSON.parse(saved) : INITIAL_EVENTS;
  });

  const [connections, setConnections] = useState<NetworkConnection[]>(() => {
    const saved = localStorage.getItem('thenam_connections');
    return saved ? JSON.parse(saved) : INITIAL_CONNECTIONS;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('thenam_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('thenam_conversations');
    return saved ? JSON.parse(saved) : INITIAL_CONVERSATIONS;
  });

  const [communities, setCommunities] = useState<CommunityGroup[]>(() => {
    const saved = localStorage.getItem('thenam_communities');
    return saved ? JSON.parse(saved) : INITIAL_COMMUNITIES;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('thenam_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>('conv_arvind');
  const [activeAutomationModal, setActiveAutomationModal] = useState<AutomationPayload | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync to LocalStorage
  // Sync to LocalStorage (Student identity is now loaded from Firestore, skipping write)

  // Load data from the backend
  useEffect(() => {
    if (currentUserProfile) {
      socket.connect();
      
      const onActivityLiked = (data: { activityId: string, likesCount: number, likedBy: string[] }) => {
        setActivities(prev => prev.map(act => {
          if (act.id === data.activityId) {
            return {
              ...act,
              likesCount: data.likesCount,
              isLiked: data.likedBy.includes(currentUserProfile.uid || currentUserProfile.id || '')
            };
          }
          return act;
        }));
      };

      const onActivityCommented = (data: { activityId: string, comment: any, commentsCount: number }) => {
        setActivities(prev => prev.map(act => {
          if (act.id === data.activityId) {
            return {
              ...act,
              commentsCount: data.commentsCount,
              comments: [...(act.comments || []), data.comment]
            };
          }
          return act;
        }));
      };

      socket.on('activity_liked', onActivityLiked);
      socket.on('activity_commented', onActivityCommented);

      const onNewEventNotification = (eventData: any) => {
        setNotifications(nPrev => [{
          id: `notif_${Date.now()}_${Math.random()}`,
          type: 'event',
          title: `New Event Added: ${eventData.title}`,
          message: `Hosted by ${eventData.speaker?.name || 'Educator'}`,
          timestamp: 'Just now',
          isRead: false,
          link: '/events',
          badgeIcon: 'calendar'
        }, ...nPrev]);
      };
      socket.on('new_event_notification', onNewEventNotification);

      // Listen to real-time events from Firestore
      const unsubscribeEvents = subscribeToEvents(
        (liveEvents) => {
          // Deduplicate by ID to guarantee single-render cards
          const uniqueEventsMap = new Map<string, EventItem>();
          liveEvents.forEach((ev) => uniqueEventsMap.set(ev.id, ev));
          setEvents(Array.from(uniqueEventsMap.values()));
        },
        (error) => console.error(error)
      );

      api.get('/courses')
        .then(res => {
          const backendCourses = res.data.map((c: any) => ({
            ...c,
            id: c._id,
            skillsGained: c.skills.map((s: any) => s.name || s),
          }));
          setCourses(backendCourses);
        })
        .catch(err => console.error('Failed to load courses from API:', err));

      api.get('/certificates/me')
        .then(res => {
          const backendCerts = res.data.map((cert: any) => ({
            ...cert,
            id: cert._id,
            courseName: cert.course?.title || cert.title,
            recipientName: currentUser.name,
            issueDate: new Date(cert.issuedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            skills: (cert.course?.skills || []).map((s: any) => s.name || s)
          }));
          setCertificates(backendCerts);
        })
        .catch(err => console.error('Failed to load certificates from API:', err));

      api.get('/projects/me')
        .then(res => {
          const backendProjects = res.data.map((p: any) => ({
            ...p,
            id: p._id,
            techStack: p.technologies.map((s: any) => s.name || s),
            coverImage: p.imageURL || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
            githubUrl: p.githubURL,
            demoUrl: p.liveURL
          }));
          setProjects(backendProjects);
        })
        .catch(err => console.error('Failed to load projects from API:', err));

      api.get('/notifications')
        .then(res => {
          const backendNotifs = res.data.map((n: any) => ({
            id: n._id,
            type: n.type,
            title: n.title,
            message: n.message,
            timestamp: new Date(n.createdAt).toLocaleDateString(),
            isRead: n.read
          }));
          setNotifications(backendNotifs);
        })
        .catch(err => console.error('Failed to load notifications from API:', err));

      api.get('/activities')
        .then(res => {
          const backendActs = res.data.map((act: any) => {
            const metadata = act.metadata || {};
            if (metadata.imageUrls && Array.isArray(metadata.imageUrls)) {
              metadata.imageUrls = metadata.imageUrls.filter((url: string) => !url.startsWith('blob:'));
            }
            
            return {
              id: act.id || act._id,
              type: act.type,
              title: act.title,
              description: act.description,
              badgeText: act.badgeText || '💭 Student Post',
              badgeTheme: act.badgeTheme || 'blue',
              timestamp: act.createdAt ? new Date(act.createdAt).toLocaleDateString() : 'Just now',
              metadata: metadata,
              author: {
                id: act.user?.firebaseUid || act.user?.id || '',
                name: act.user?.name || 'Student',
                avatar: act.user?.avatar || act.user?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
                headline: act.user?.headline || `${act.user?.year || 'Student'} - ${act.user?.department || 'Engineering'}`,
                college: act.user?.college || act.user?.collegeName || 'DMI College of Engineering'
              },
              likesCount: act.likesCount || 0,
              commentsCount: act.commentsCount || 0,
              sharesCount: act.sharesCount || 0,
              comments: act.comments || [],
              isLiked: act.likedBy ? act.likedBy.includes(currentUserProfile.uid || currentUserProfile.id || '') : false,
              isSaved: false,
              createdAt: act.createdAt
            };
          });
          
          setActivities(backendActs);
          setIsFeedLoading(false);
        })
        .catch(err => {
          console.error('Failed to load activities from API:', err);
          setIsFeedLoading(false);
        });

      api.get('/profile/network/recommendations')
        .then(res => {
           setConnections(res.data);
        })
        .catch(err => console.error('Failed to load peer network:', err));

      return () => {
        socket.off('activity_liked', onActivityLiked);
        socket.off('activity_commented', onActivityCommented);
        socket.off('new_event_notification');
        unsubscribeEvents();
        socket.disconnect();
      };
    }
  }, [currentUserProfile, currentUser.name]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const updateCurrentUser = async (updated: Partial<StudentProfile>) => {
    if (!currentUserProfile) return;
    try {
      const dbUpdates: any = {};
      if (updated.name) dbUpdates.name = updated.name;
      if (updated.department) dbUpdates.department = updated.department;
      if (updated.yearOfStudy) dbUpdates.year = updated.yearOfStudy;
      if (updated.college) dbUpdates.collegeName = updated.college;
      if (updated.phone) dbUpdates.phoneNumber = updated.phone;
      if (updated.avatar) dbUpdates.photoURL = updated.avatar;
      if (updated.linkedinUrl !== undefined) dbUpdates.linkedinURL = updated.linkedinUrl || null;
      if (updated.githubUrl !== undefined) dbUpdates.githubURL = updated.githubUrl || null;
      if (updated.location) {
        const parts = updated.location.split(',');
        dbUpdates.collegeLocation = {
          city: parts[0]?.trim() || '',
          state: parts[1]?.trim() || '',
          country: parts[2]?.trim() || 'India'
        };
      }

      await api.put('/profile/me', dbUpdates);
      await refreshProfile();
      showToast('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update user profile via API:', error);
      showToast('Error saving profile modifications');
    }
  };

  const addSkillToProfile = async (skillName: string) => {
    if (!skillName.trim() || !currentUserProfile) return;
    try {
      const res = await api.get(`/skills?search=${encodeURIComponent(skillName.trim())}`);
      const found = res.data?.[0];
      if (!found) {
        showToast(`Skill "${skillName}" not found in skills catalog.`);
        return;
      }
      
      const currentSkills = currentUserProfile.skills || [];
      const currentIds = currentSkills.map((s: any) => s._id || s);
      
      if (!currentIds.includes(found._id)) {
        const newSkills = [...currentIds, found._id];
        await api.put('/profile/me', { skills: newSkills });
        await refreshProfile();
        showToast(`Skill "${found.name}" added to profile`);
      }
    } catch (error) {
      console.error('Error adding skill:', error);
    }
  };

  const removeSkillFromProfile = async (skillName: string) => {
    if (!currentUserProfile) return;
    try {
      const currentSkills = currentUserProfile.skills || [];
      const newSkills = currentSkills
        .filter((s: any) => {
          const name = s.name || s;
          return name.toLowerCase() !== skillName.toLowerCase();
        })
        .map((s: any) => s._id || s);

      await api.put('/profile/me', { skills: newSkills });
      await refreshProfile();
      showToast(`Skill "${skillName}" removed`);
    } catch (error) {
      console.error('Error removing skill:', error);
    }
  };

  // Course actions
  const enrollInCourse = async (courseId: string) => {
    try {
      await api.post(`/courses/${courseId}/enroll`);
      const res = await api.get('/courses');
      const backendCourses = res.data.map((c: any) => ({
        ...c,
        id: c._id,
        skillsGained: c.skills.map((s: any) => s.name || s),
      }));
      setCourses(backendCourses);
      await refreshProfile();
      showToast('Enrolled in course successfully!');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to enroll');
    }
  };

  const toggleCourseBookmark = (courseId: string) => {
    setCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        const nextState = !c.isBookmarked;
        showToast(nextState ? 'Course bookmarked' : 'Course removed from bookmarks');
        return { ...c, isBookmarked: nextState };
      }
      return c;
    }));
  };

  const completeCourseModule = async (courseId: string, moduleId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const total = course.totalModules || 5;
    const completed = (course.completedModules || 0) + 1;
    const nextProgress = Math.min(100, Math.round((completed / total) * 100));

    try {
      await api.put(`/courses/${courseId}/progress`, { progress: nextProgress });
      const res = await api.get('/courses');
      const backendCourses = res.data.map((c: any) => ({
        ...c,
        id: c._id,
        skillsGained: c.skills.map((s: any) => s.name || s),
      }));
      setCourses(backendCourses);
      await refreshProfile();
    } catch (e) {
      console.error('Failed to update module progress:', e);
    }
  };

  // THE AUTOMATED EXPERIENCE PIPELINE
  const triggerCourseCompletionAutomation = async (courseId: string): Promise<Certificate | null> => {
    try {
      const res = await api.post(`/courses/${courseId}/complete`);
      const { enrollment, certificate, xpGained, skillsAdded } = res.data;

      // Update states from backend
      const coursesRes = await api.get('/courses');
      const backendCourses = coursesRes.data.map((c: any) => ({
        ...c,
        id: c._id,
        skillsGained: c.skills.map((s: any) => s.name || s),
      }));
      setCourses(backendCourses);

      const certsRes = await api.get('/certificates/me');
      const backendCerts = certsRes.data.map((cert: any) => ({
        ...cert,
        id: cert._id,
        courseName: cert.course?.title || cert.title,
        recipientName: currentUser.name,
        issueDate: new Date(cert.issuedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        skills: (cert.course?.skills || []).map((s: any) => s.name || s)
      }));
      setCertificates(backendCerts);

      const notifsRes = await api.get('/notifications');
      const backendNotifs = notifsRes.data.map((n: any) => ({
        id: n._id,
        type: n.type,
        title: n.title,
        message: n.message,
        timestamp: new Date(n.createdAt).toLocaleDateString(),
        isRead: n.read
      }));
      setNotifications(backendNotifs);

      const actsRes = await api.get('/activities');
      const backendActs = actsRes.data.map((act: any) => ({
        id: act.id || act._id,
        type: act.type,
        title: act.title,
        description: act.description,
        badgeText: act.badgeText || '💭 Student Post',
        badgeTheme: act.badgeTheme || 'blue',
        timestamp: act.createdAt ? new Date(act.createdAt).toLocaleDateString() : 'Just now',
        metadata: act.metadata || {},
        author: {
          id: act.user?.firebaseUid || act.user?.id || '',
          name: act.user?.name || 'Student',
          avatar: act.user?.avatar || act.user?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
          headline: act.user?.headline || `${act.user?.year || 'Student'} - ${act.user?.department || 'Engineering'}`,
          college: act.user?.college || act.user?.collegeName || 'DMI College of Engineering'
        },
        likesCount: act.likesCount || 0,
        commentsCount: act.commentsCount || 0,
        sharesCount: act.sharesCount || 0,
        comments: act.comments || [],
        isLiked: false,
        isSaved: false,
        createdAt: act.createdAt
      }));
      setActivities(prev => {
        const newActs = [...backendActs];
        const mockActs = INITIAL_ACTIVITIES.filter(mAct => !newActs.find(a => a.id === mAct.id));
        return [...newActs, ...mockActs];
      });

      await refreshProfile();

      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      // Format Certificate object for UI
      const certUIObj: Certificate = {
        id: certificate._id,
        title: certificate.title,
        recipientName: currentUser.name,
        recipientUid: currentUser.id,
        courseId: courseId,
        courseName: certificate.title.replace(' Competency Certificate', ''),
        issueDate: new Date(certificate.issuedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        credentialId: certificate.certificateNumber,
        verificationHash: certificate.verificationCode,
        verifiedBy: 'THENAM Academic Certification Board & DMI College of Engineering',
        grade: 'Distinction (98.5% Score)',
        skills: skillsAdded,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${certificate.certificateURL}`,
        issuerLogo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=100&auto=format&fit=crop&q=80',
        certificateType: 'Course Mastery',
        isVerified: true
      };

      setActiveAutomationModal({
        title: 'Course Completed & Certificate Awarded!',
        courseName: certUIObj.courseName,
        certificateId: certUIObj.id,
        skillsAdded: skillsAdded,
        xpGained: xpGained
      });

      return certUIObj;
    } catch (error) {
      console.error('Failed to complete course on backend:', error);
      showToast('Error registering course completion');
      return null;
    }
  };

  const closeAutomationModal = () => {
    setActiveAutomationModal(null);
  };

  // Activity Feed interactions
  const createActivity = async (activityData: Omit<ActivityItem, 'id' | 'timestamp' | 'likesCount' | 'isLiked' | 'commentsCount' | 'comments' | 'sharesCount'>) => {
    try {
      await api.post('/activities', activityData);
      
      const newActivity: ActivityItem = {
        ...activityData,
        id: `act_${Date.now()}`,
        timestamp: 'Just now',
        createdAt: new Date().toISOString(),
        likesCount: 0,
        isLiked: false,
        commentsCount: 0,
        comments: [],
        sharesCount: 0
      };
      setActivities(prev => [newActivity, ...prev]);
      showToast('Activity shared with your THENAM network!');
    } catch (err) {
      console.error('Failed to create activity:', err);
      showToast('Failed to publish activity.');
    }
  };

  const toggleLikeActivity = async (activityId: string) => {
    // Optimistic update
    setActivities(prev => prev.map(act => {
      if (act.id === activityId) {
        const isLiked = !act.isLiked;
        return {
          ...act,
          isLiked,
          likesCount: isLiked ? act.likesCount + 1 : Math.max(0, act.likesCount - 1)
        };
      }
      return act;
    }));

    try {
      if (!activityId.startsWith('act_')) {
        await api.post(`/activities/${activityId}/like`);
      }
    } catch (err) {
      console.error('Failed to like activity:', err);
    }
  };

  const addCommentToActivity = async (activityId: string, text: string) => {
    if (!text.trim()) return;
    const newComment = {
      id: `c_${Date.now()}`,
      author: {
        name: currentUser.name,
        avatar: currentUser.avatar,
        headline: currentUser.headline
      },
      text: text.trim(),
      timestamp: 'Just now',
      likes: 0
    };

    // Optimistic update
    setActivities(prev => prev.map(act => {
      if (act.id === activityId) {
        return {
          ...act,
          commentsCount: act.commentsCount + 1,
          comments: [...act.comments, newComment]
        };
      }
      return act;
    }));

    try {
      if (!activityId.startsWith('act_')) {
        await api.post(`/activities/${activityId}/comment`, { text: text.trim() });
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  const toggleSaveActivity = (activityId: string) => {
    setActivities(prev => prev.map(act => {
      if (act.id === activityId) {
        const isSaved = !act.isSaved;
        showToast(isSaved ? 'Activity saved to your bookmarks' : 'Activity removed from bookmarks');
        return { ...act, isSaved };
      }
      return act;
    }));
  };

  const deleteActivity = async (activityId: string) => {
    setActivities(prev => prev.filter(act => act.id !== activityId));
    showToast('Activity removed');
    
    try {
      if (activityId.startsWith('act_')) return;
      await api.delete(`/activities/${activityId}`);
    } catch (err) {
      console.error('Failed to delete activity from backend:', err);
    }
  };

  const getCertificateById = (id: string) => {
    return certificates.find(c => c.id === id || c.credentialId === id);
  };

  // Projects
  const addProject = async (proj: Omit<Project, 'id' | 'likesCount' | 'viewsCount' | 'createdAt'>) => {
    try {
      const skillsRes = await api.get('/skills');
      const backendTechIds = proj.techStack.map((techName: string) => {
        const found = skillsRes.data.find((s: any) => s.name.toLowerCase() === techName.toLowerCase() || s._id === techName);
        return found ? found._id : null;
      }).filter(Boolean);

      const dbProj = {
        title: proj.title,
        description: proj.description,
        technologies: backendTechIds,
        githubURL: proj.githubUrl || '',
        liveURL: proj.demoUrl || '',
        imageURL: proj.coverImage || ''
      };

      await api.post('/projects', dbProj);
      const res = await api.get('/projects/me');
      const backendProjects = res.data.map((p: any) => ({
        ...p,
        id: p._id,
        techStack: p.technologies.map((s: any) => s.name || s),
        coverImage: p.imageURL || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
        githubUrl: p.githubURL,
        demoUrl: p.liveURL
      }));
      setProjects(backendProjects);
      await refreshProfile();
      showToast('Project published to your portfolio!');
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to add project');
    }
  };

  const updateProject = async (id: string, updated: Partial<Project>) => {
    try {
      const dbUpdates: any = {};
      if (updated.title) dbUpdates.title = updated.title;
      if (updated.description) dbUpdates.description = updated.description;
      if (updated.githubUrl !== undefined) dbUpdates.githubURL = updated.githubUrl;
      if (updated.demoUrl !== undefined) dbUpdates.liveURL = updated.demoUrl;
      if (updated.coverImage !== undefined) dbUpdates.imageURL = updated.coverImage;
      if (updated.techStack) {
        const skillsRes = await api.get('/skills');
        dbUpdates.technologies = updated.techStack.map((techName: string) => {
          const found = skillsRes.data.find((s: any) => s.name.toLowerCase() === techName.toLowerCase() || s._id === techName);
          return found ? found._id : null;
        }).filter(Boolean);
      }

      await api.put(`/projects/${id}`, dbUpdates);
      const res = await api.get('/projects/me');
      const backendProjects = res.data.map((p: any) => ({
        ...p,
        id: p._id,
        techStack: p.technologies.map((s: any) => s.name || s),
        coverImage: p.imageURL || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
        githubUrl: p.githubURL,
        demoUrl: p.liveURL
      }));
      setProjects(backendProjects);
      await refreshProfile();
      showToast('Project updated successfully');
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to update project');
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await api.delete(`/projects/${id}`);
      const res = await api.get('/projects/me');
      const backendProjects = res.data.map((p: any) => ({
        ...p,
        id: p._id,
        techStack: p.technologies.map((s: any) => s.name || s),
        coverImage: p.imageURL || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
        githubUrl: p.githubURL,
        demoUrl: p.liveURL
      }));
      setProjects(backendProjects);
      await refreshProfile();
      showToast('Project deleted successfully');
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to delete project');
    }
  };

  const toggleLikeProject = (id: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        const isLiked = !p.isLiked;
        return {
          ...p,
          isLiked,
          likesCount: isLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1)
        };
      }
      return p;
    }));
  };

  // Events
  const toggleEventRegistration = async (eventId: string) => {
    const event = events.find(ev => ev.id === eventId);
    if (!event) return;
    
    const isCurrentlyRegistered = event.registeredUserIds?.includes(currentUser.id) || false;

    try {
      await toggleEventRegistrationInFirestore(eventId, isCurrentlyRegistered, currentUser.id);
      showToast(isCurrentlyRegistered ? `Registration cancelled for ${event.title}` : `Successfully registered for ${event.title}`);
    } catch (err) {
      console.error("Failed to update registration:", err);
      showToast("Error updating event registration");
    }
  };

  const createEvent = async (eventData: Omit<EventItem, 'id' | 'registeredCount' | 'isRegistered'>) => {
    const newEvent: EventItem = {
      ...eventData,
      id: `ev_${Date.now()}`,
      creatorId: currentUser.id,
      registeredCount: 0,
      isRegistered: false
    };

    try {
      await createEventInFirestore(newEvent);
    } catch (err) {
      console.error('Failed to store event in Firestore:', err);
      showToast('Error storing event in database.');
      throw err;
    }

    // Emit real-time notification
    socket.emit('create_event', newEvent);
    
    showToast('Event created successfully and broadcasted globally!');
  };

  const deleteEvent = async (eventId: string) => {
    const event = events.find(ev => ev.id === eventId);
    if (!event) return;

    const isAuthor = currentUser.id === event.creatorId;
    const isEducatorOrAdmin = currentUser.role === 'faculty' || currentUser.role === 'admin';

    if (!isAuthor && !isEducatorOrAdmin) {
      showToast("Forbidden: Only educators and the event creator can delete this event.");
      return;
    }

    try {
      await deleteEventInFirestore(eventId, event.creatorId || '', currentUser.role);
      showToast('Event deleted successfully');
    } catch (err) {
      console.error('Failed to delete event:', err);
      showToast('Error deleting event.');
    }
  };

  const toggleFollowEducator = (educatorId: string) => {
    const isFollowing = currentUser.followingEducators?.includes(educatorId);
    
    updateCurrentUser({
      followingEducators: isFollowing 
        ? currentUser.followingEducators?.filter(id => id !== educatorId)
        : [...(currentUser.followingEducators || []), educatorId]
    });
    
    if (isFollowing) {
      showToast('Unfollowed educator.');
    } else {
      showToast('You are now following this educator!');
    }
  };

  // Network
  const toggleConnectionStatus = async (connectionId: string) => {
    setConnections(prev => prev.map(conn => {
      if (conn.id === connectionId) {
        let newStatus: 'none' | 'pending' | 'connected' | 'received' = 'none';
        if (conn.status === 'none' || conn.status === 'connect') {
          newStatus = 'pending';
          showToast(`Connection request sent to ${conn.name}`);
        } else if (conn.status === 'pending') {
          newStatus = 'none';
          showToast(`Cancelled request to ${conn.name}`);
        } else if (conn.status === 'received') {
          newStatus = 'connected';
          showToast(`You are now connected with ${conn.name}`);
        } else if (conn.status === 'connected') {
          newStatus = 'none';
          showToast(`Removed connection with ${conn.name}`);
        }
        return { ...conn, status: newStatus };
      }
      return conn;
    }));

    try {
      await api.post('/profiles/network/connect', { targetUserId: connectionId });
    } catch (err) {
      console.error('Failed to send connection request:', err);
    }
  };

  // Notifications
  const markNotificationAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error('Failed to mark read notification:', e);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      showToast('All notifications marked as read');
    } catch (e) {
      console.error('Failed to mark all read notifications:', e);
    }
  };

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  // Conversations
  const sendMessage = (conversationId: string, text: string) => {
    if (!text.trim()) return;
    const newMsg = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: true
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          lastMessage: text.trim(),
          lastMessageTime: 'Just now',
          messages: [...conv.messages, newMsg]
        };
      }
      return conv;
    }));
  };

  // Communities
  const toggleJoinCommunity = (communityId: string) => {
    setCommunities(prev => prev.map(comm => {
      if (comm.id === communityId) {
        const isJoined = !comm.isJoined;
        showToast(isJoined ? `Joined the ${comm.name} community!` : `Left ${comm.name}`);
        return {
          ...comm,
          isJoined,
          memberCount: isJoined ? comm.memberCount + 1 : Math.max(0, comm.memberCount - 1)
        };
      }
      return comm;
    }));
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    showToast('Preferences updated');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        updateCurrentUser,
        addSkillToProfile,
        removeSkillFromProfile,
        courses,
        enrollInCourse,
        toggleCourseBookmark,
        completeCourseModule,
        triggerCourseCompletionAutomation,
        activeAutomationModal,
        closeAutomationModal,
        activities,
        isFeedLoading,
        createActivity,
        toggleLikeActivity,
        addCommentToActivity,
        toggleSaveActivity,
        deleteActivity,
        certificates,
        getCertificateById,
        projects,
        addProject,
        updateProject,
        deleteProject,
        toggleLikeProject,
        events,
        toggleEventRegistration,
        connections,
        toggleConnectionStatus,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        unreadNotificationsCount,
        conversations,
        activeConversationId,
        setActiveConversationId,
        sendMessage,
        communities,
        toggleJoinCommunity,
        settings,
        updateSettings,
        toastMessage,
        showToast,
        createEvent,
        deleteEvent,
        toggleFollowEducator
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
