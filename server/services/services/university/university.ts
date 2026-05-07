/**
 * SYSTEM G — CREATORVAULT UNIVERSITY
 * Course creation, enrollment, progress tracking, certificates, marketplace integration
 */

export type LessonType = "video" | "text" | "quiz" | "assignment";
export type CourseCategory =
  | "adult-monetization"
  | "content-creation"
  | "dominican-culture"
  | "business"
  | "marketing"
  | "psychology"
  | "technical";

export interface Lesson {
  lessonId: string;
  moduleId: string;
  title: string;
  type: LessonType;
  content: string; // URL for video, markdown for text
  duration: number; // minutes
  order: number;
  required: boolean;
}

export interface Module {
  moduleId: string;
  courseId: string;
  title: string;
  description: string;
  lessons: Lesson[];
  order: number;
  estimatedDuration: number; // minutes
}

export interface Course {
  courseId: string;
  instructorId: string;
  title: string;
  description: string;
  category: CourseCategory;
  modules: Module[];
  price: number;
  currency: "USD" | "DOP" | "HTG";
  free: boolean;
  certificateEnabled: boolean;
  marketplaceProductId?: string; // Link to marketplace
  totalDuration: number; // minutes
  enrollmentCount: number;
  completionRate: number;
  rating: number;
  active: boolean;
  createdAt: number;
}

export interface Enrollment {
  enrollmentId: string;
  courseId: string;
  userId: string;
  status: "active" | "completed" | "dropped";
  progress: number; // 0-100
  completedLessons: string[];
  currentLesson?: string;
  startedAt: number;
  completedAt?: number;
  certificateIssued: boolean;
  certificateId?: string;
}

export interface Certificate {
  certificateId: string;
  enrollmentId: string;
  courseId: string;
  userId: string;
  courseName: string;
  instructorName: string;
  completionDate: number;
  issuedAt: number;
  verificationUrl: string;
}

export interface LessonProgress {
  lessonId: string;
  userId: string;
  completed: boolean;
  timeSpent: number; // seconds
  lastAccessedAt: number;
  completedAt?: number;
}

export class CreatorVaultUniversity {
  /**
   * Create course
   */
  createCourse(input: {
    instructorId: string;
    title: string;
    description: string;
    category: CourseCategory;
    price: number;
    currency: "USD" | "DOP" | "HTG";
    free: boolean;
    certificateEnabled: boolean;
  }): Course {
    const courseId = `course-${Date.now()}-${input.instructorId}`;

    return {
      courseId,
      instructorId: input.instructorId,
      title: input.title,
      description: input.description,
      category: input.category,
      modules: [],
      price: input.price,
      currency: input.currency,
      free: input.free,
      certificateEnabled: input.certificateEnabled,
      totalDuration: 0,
      enrollmentCount: 0,
      completionRate: 0,
      rating: 0,
      active: true,
      createdAt: Date.now(),
    };
  }

  /**
   * Add module to course
   */
  addModule(
    course: Course,
    input: {
      title: string;
      description: string;
      order: number;
    }
  ): Module {
    const moduleId = `module-${Date.now()}-${course.courseId}`;

    const module: Module = {
      moduleId,
      courseId: course.courseId,
      title: input.title,
      description: input.description,
      lessons: [],
      order: input.order,
      estimatedDuration: 0,
    };

    course.modules.push(module);
    return module;
  }

  /**
   * Add lesson to module
   */
  addLesson(
    module: Module,
    input: {
      title: string;
      type: LessonType;
      content: string;
      duration: number;
      order: number;
      required: boolean;
    }
  ): Lesson {
    const lessonId = `lesson-${Date.now()}-${module.moduleId}`;

    const lesson: Lesson = {
      lessonId,
      moduleId: module.moduleId,
      title: input.title,
      type: input.type,
      content: input.content,
      duration: input.duration,
      order: input.order,
      required: input.required,
    };

    module.lessons.push(lesson);
    module.estimatedDuration += input.duration;

    return lesson;
  }

  /**
   * Enroll user in course
   */
  enrollUser(courseId: string, userId: string): Enrollment {
    const enrollmentId = `enroll-${Date.now()}-${userId}-${courseId}`;

    return {
      enrollmentId,
      courseId,
      userId,
      status: "active",
      progress: 0,
      completedLessons: [],
      startedAt: Date.now(),
      certificateIssued: false,
    };
  }

  /**
   * Mark lesson complete
   */
  completeLesson(
    enrollment: Enrollment,
    lessonId: string,
    course: Course
  ): { enrollment: Enrollment; progress: LessonProgress } {
    // Add to completed lessons
    if (!enrollment.completedLessons.includes(lessonId)) {
      enrollment.completedLessons.push(lessonId);
    }

    // Calculate progress
    const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    enrollment.progress = (enrollment.completedLessons.length / totalLessons) * 100;

    // Set current lesson to next incomplete
    const allLessons = course.modules.flatMap((m) => m.lessons);
    const nextLesson = allLessons.find(
      (l) => !enrollment.completedLessons.includes(l.lessonId)
    );
    enrollment.currentLesson = nextLesson?.lessonId;

    // Check if course completed
    if (enrollment.progress >= 99.9 && enrollment.status === "active") {
      enrollment.status = "completed";
      enrollment.completedAt = Date.now();
    }

    const progress: LessonProgress = {
      lessonId,
      userId: enrollment.userId,
      completed: true,
      timeSpent: 0,
      lastAccessedAt: Date.now(),
      completedAt: Date.now(),
    };

    return { enrollment, progress };
  }

  /**
   * Issue certificate
   */
  issueCertificate(enrollment: Enrollment, course: Course): Certificate {
    const certificateId = `cert-${Date.now()}-${enrollment.userId}`;

    const certificate: Certificate = {
      certificateId,
      enrollmentId: enrollment.enrollmentId,
      courseId: course.courseId,
      userId: enrollment.userId,
      courseName: course.title,
      instructorName: `Instructor ${course.instructorId}`,
      completionDate: enrollment.completedAt || Date.now(),
      issuedAt: Date.now(),
      verificationUrl: `https://creatorvault.com/certificates/${certificateId}`,
    };

    enrollment.certificateIssued = true;
    enrollment.certificateId = certificateId;

    return certificate;
  }

  /**
   * Get course catalog
   */
  getCatalog(courses: Course[]): {
    totalCourses: number;
    byCategory: Record<CourseCategory, number>;
    freeCourses: number;
    paidCourses: number;
    totalEnrollments: number;
    avgCompletionRate: number;
  } {
    const activeCourses = courses.filter((c) => c.active);

    const byCategory: Record<CourseCategory, number> = {
      "adult-monetization": 0,
      "content-creation": 0,
      "dominican-culture": 0,
      business: 0,
      marketing: 0,
      psychology: 0,
      technical: 0,
    };

    let freeCourses = 0;
    let paidCourses = 0;
    let totalEnrollments = 0;
    let totalCompletionRate = 0;

    for (const course of activeCourses) {
      byCategory[course.category]++;
      if (course.free) {
        freeCourses++;
      } else {
        paidCourses++;
      }
      totalEnrollments += course.enrollmentCount;
      totalCompletionRate += course.completionRate;
    }

    const avgCompletionRate =
      activeCourses.length > 0 ? totalCompletionRate / activeCourses.length : 0;

    return {
      totalCourses: activeCourses.length,
      byCategory,
      freeCourses,
      paidCourses,
      totalEnrollments,
      avgCompletionRate,
    };
  }

  /**
   * Get user progress
   */
  getUserProgress(userId: string, enrollments: Enrollment[]): {
    totalEnrollments: number;
    activeEnrollments: number;
    completedCourses: number;
    avgProgress: number;
    certificatesEarned: number;
  } {
    const userEnrollments = enrollments.filter((e) => e.userId === userId);

    const activeEnrollments = userEnrollments.filter((e) => e.status === "active").length;
    const completedCourses = userEnrollments.filter((e) => e.status === "completed").length;
    const certificatesEarned = userEnrollments.filter((e) => e.certificateIssued).length;

    const totalProgress = userEnrollments.reduce((sum, e) => sum + e.progress, 0);
    const avgProgress =
      userEnrollments.length > 0 ? totalProgress / userEnrollments.length : 0;

    return {
      totalEnrollments: userEnrollments.length,
      activeEnrollments,
      completedCourses,
      avgProgress,
      certificatesEarned,
    };
  }

  /**
   * Recommend courses (agent-driven)
   */
  recommendCourses(
    userProfile: {
      interests: string[];
      completedCourses: string[];
      skillLevel: "beginner" | "intermediate" | "advanced";
    },
    courses: Course[]
  ): Course[] {
    const activeCourses = courses.filter((c) => c.active);

    // Score courses
    const scored = activeCourses.map((course) => {
      let score = 0;

      // Category match
      if (userProfile.interests.includes(course.category)) {
        score += 50;
      }

      // Not already completed
      if (!userProfile.completedCourses.includes(course.courseId)) {
        score += 30;
      }

      // High rating
      if (course.rating > 4.5) {
        score += 20;
      }

      return { course, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, 5).map((s) => s.course);
  }

  /**
   * Marketplace integration
   */
  linkToMarketplace(course: Course, marketplaceProductId: string): Course {
    course.marketplaceProductId = marketplaceProductId;
    return course;
  }

  /**
   * Adult sector training
   */
  createAdultMonetizationCourse(instructorId: string): Course {
    const course = this.createCourse({
      instructorId,
      title: "Adult Creator Monetization Mastery",
      description:
        "Learn how to dominate OnlyFans, Fansly, and adult platforms. KingCam's proven strategies from Dallas to DR.",
      category: "adult-monetization",
      price: 997,
      currency: "USD",
      free: false,
      certificateEnabled: true,
    });

    // Module 1: Platform Setup
    const module1 = this.addModule(course, {
      title: "Platform Setup & Optimization",
      description: "Get your profiles dialed in for maximum conversions",
      order: 1,
    });

    this.addLesson(module1, {
      title: "OnlyFans Profile Optimization",
      type: "video",
      content: "https://video.example.com/onlyfans-setup",
      duration: 45,
      order: 1,
      required: true,
    });

    this.addLesson(module1, {
      title: "Fansly vs OnlyFans: Which Platform?",
      type: "video",
      content: "https://video.example.com/platform-comparison",
      duration: 30,
      order: 2,
      required: true,
    });

    // Module 2: Content Strategy
    const module2 = this.addModule(course, {
      title: "Content Strategy That Converts",
      description: "What to post, when to post, how to hook subscribers",
      order: 2,
    });

    this.addLesson(module2, {
      title: "The 7 Content Pillars",
      type: "video",
      content: "https://video.example.com/content-pillars",
      duration: 60,
      order: 1,
      required: true,
    });

    this.addLesson(module2, {
      title: "DM Automation Scripts",
      type: "text",
      content: "# DM Scripts\n\nProven scripts that convert...",
      duration: 20,
      order: 2,
      required: true,
    });

    // Module 3: Revenue Maximization
    const module3 = this.addModule(course, {
      title: "Revenue Maximization",
      description: "PPV, customs, upsells, and retention",
      order: 3,
    });

    this.addLesson(module3, {
      title: "PPV Strategy",
      type: "video",
      content: "https://video.example.com/ppv-strategy",
      duration: 40,
      order: 1,
      required: true,
    });

    this.addLesson(module3, {
      title: "Customs & High-Ticket Offers",
      type: "video",
      content: "https://video.example.com/customs",
      duration: 35,
      order: 2,
      required: true,
    });

    // Calculate total duration
    course.totalDuration = course.modules.reduce((sum, m) => sum + m.estimatedDuration, 0);

    return course;
  }

  /**
   * Dominican culture training
   */
  createDominicanCultureCourse(instructorId: string): Course {
    const course = this.createCourse({
      instructorId,
      title: "Dominican Republic Creator Expansion",
      description:
        "How to expand your creator business to DR. Culture, language, creators, and opportunities.",
      category: "dominican-culture",
      price: 497,
      currency: "USD",
      free: false,
      certificateEnabled: true,
    });

    const module1 = this.addModule(course, {
      title: "DR Culture & Business Landscape",
      description: "Understanding the Dominican creator economy",
      order: 1,
    });

    this.addLesson(module1, {
      title: "DR Creator Market Overview",
      type: "video",
      content: "https://video.example.com/dr-market",
      duration: 30,
      order: 1,
      required: true,
    });

    this.addLesson(module1, {
      title: "Language Essentials for Creators",
      type: "text",
      content: "# Spanish for Creators\n\nKey phrases and cultural context...",
      duration: 25,
      order: 2,
      required: true,
    });

    course.totalDuration = course.modules.reduce((sum, m) => sum + m.estimatedDuration, 0);

    return course;
  }
}
