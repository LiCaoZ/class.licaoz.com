import React, { useState, useEffect, useCallback, useRef } from 'react';

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface Course {
  name: string;
  time: string;
  location: string;
}

interface ScheduleData {
  timeSlots: {
    summer: string[];
    autumn: string[];
  };
  slotMapping: {
    [key: string]: number;
  };
  locations: {
    building: string;
    room: string;
  }[];
  courses: {
    id: number;
    name: string;
    locationIndex: number;
  }[];
  schedule: {
    [key: string]: [string, number][];
  };
}

interface CourseInfo {
  current: Course | null;
  next: Course | null;
}

// Special dates and holidays
const SPECIAL_DATES = {
  holidays: [
    { start: new Date(2025, 9, 1), end: new Date(2025, 9, 8) }, // 10.1-10.8 中秋国庆
    { start: new Date(2026, 0, 1), end: new Date(2026, 0, 1) }, // 1.1 元旦
  ],
  militaryTraining: [
    { start: new Date(2025, 9, 10), end: new Date(2025, 9, 23) }, // 10.10-10.23 军训
  ],
  examPeriod: [
    { start: new Date(2026, 0, 8), end: new Date(2026, 0, 18) }, // 1.8-1.18 期末考试
  ]
};

const CourseScheduleParser: React.FC<{ onParse: (info: CourseInfo) => void }> = ({ onParse }) => {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const response = await fetch('/course-schedule.json');
        const data: ScheduleData = await response.json();
        setScheduleData(data);
      } catch (error) {
        console.error('Failed to fetch schedule:', error);
      }
    };

    fetchSchedule();
  }, []);

  const convertToUTC8 = (date: Date): Date => {
    const offset = date.getTimezoneOffset();
    const utc8Offset = -480; // UTC+8 is 480 minutes ahead of UTC
    const diff = utc8Offset - offset;
    return new Date(date.getTime() + diff * 60000);
  };

  const isUTC8 = (date: Date): boolean => {
    const offset = date.getTimezoneOffset();
    return offset === -480;
  };

  const getCurrentTimeSlots = (date: Date): string[] => {
    if (!scheduleData) return [];
    
    // Summer schedule: from first Monday in May until first Monday in October
    // Autumn/Winter schedule: from first Monday in October until first Monday in May (next year)
    const year = date.getFullYear();
    
    // Find first Monday of May in current year
    const mayFirst = new Date(year, 4, 1); // May 1st
    const mayFirstDayOfWeek = mayFirst.getDay();
    const mayFirstMonday = mayFirstDayOfWeek === 1 ? 1 : (8 - mayFirstDayOfWeek + 1);
    
    // Find first Monday of October in current year
    const octoberFirst = new Date(year, 9, 1); // October 1st
    const octoberFirstDayOfWeek = octoberFirst.getDay();
    const octoberFirstMonday = octoberFirstDayOfWeek === 1 ? 1 : (8 - octoberFirstDayOfWeek + 1);
    
    // Create dates for comparison
    const summerStart = new Date(year, 4, mayFirstMonday); // First Monday of May
    const summerEnd = new Date(year, 9, octoberFirstMonday); // First Monday of October
    
    // Use summer schedule if current date is between first Monday of May and first Monday of October
    if (date >= summerStart && date < summerEnd) {
      return scheduleData.timeSlots.summer;
    } else {
      return scheduleData.timeSlots.autumn;
    }
  };

  const formatLocation = (location: { building: string; room: string }): string => {
    if (!location.building && !location.room) return '';
    return location.room ? `${location.building}-${location.room}` : location.building;
  };

  const isSpecialDate = (date: Date): string | null => {
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Check holidays
    for (const holiday of SPECIAL_DATES.holidays) {
      if (dateOnly >= holiday.start && dateOnly <= holiday.end) {
        return 'holiday';
      }
    }
    
    // Check military training
    for (const training of SPECIAL_DATES.militaryTraining) {
      if (dateOnly >= training.start && dateOnly <= training.end) {
        return 'military_training';
      }
    }
    
    // Check exam period
    for (const exam of SPECIAL_DATES.examPeriod) {
      if (dateOnly >= exam.start && dateOnly <= exam.end) {
        return 'exam_period';
      }
    }
    
    return null;
  };

  const getNextScheduleUpdate = useCallback((schedule: ScheduleData, date: Date): number => {
    const utc8Date = isUTC8(date) ? date : convertToUTC8(date);
    const day = utc8Date.getDay() === 0 ? 7 : utc8Date.getDay();
    const currentTime = utc8Date.toTimeString().slice(0, 5);
    
    const todayCourses = schedule.schedule[day];
    const currentTimeSlots = getCurrentTimeSlots(utc8Date);
    
    if (!todayCourses || todayCourses.length === 0) {
      // No courses today, check tomorrow at midnight
      const tomorrow = new Date(utc8Date);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow.getTime() - utc8Date.getTime();
    }

    for (const [slotNumber, courseId] of todayCourses) {
      const slotIndex = schedule.slotMapping[slotNumber];
      
      if (slotIndex === undefined || slotIndex >= currentTimeSlots.length) continue;
      
      const [startTime, endTime] = currentTimeSlots[slotIndex].split('-');
      
      if (currentTime < startTime) {
        // Next event is class start
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const startDate = new Date(utc8Date);
        startDate.setHours(startHour, startMinute, 0, 0);
        return startDate.getTime() - utc8Date.getTime();
      } else if (currentTime < endTime) {
        // Next event is class end
        const [endHour, endMinute] = endTime.split(':').map(Number);
        const endDate = new Date(utc8Date);
        endDate.setHours(endHour, endMinute, 0, 0);
        return endDate.getTime() - utc8Date.getTime();
      }
    }
    
    // All classes for today are over, check tomorrow at midnight
    const tomorrow = new Date(utc8Date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime() - utc8Date.getTime();
  }, [getCurrentTimeSlots]);

  const getCourseInfo = useCallback((schedule: ScheduleData, date: Date): CourseInfo => {
    const utc8Date = isUTC8(date) ? date : convertToUTC8(date);
    
    // Check for special dates
    const specialType = isSpecialDate(utc8Date);
    if (specialType) {
      return { current: null, next: null };
    }

    const day = utc8Date.getDay() === 0 ? 7 : utc8Date.getDay();
    const currentTime = utc8Date.toTimeString().slice(0, 5);
    
    const todayCourses = schedule.schedule[day];
    
    if (!todayCourses) return { current: null, next: null };

    const currentTimeSlots = getCurrentTimeSlots(utc8Date);
    let currentCourse: Course | null = null;
    let nextCourse: Course | null = null;

    for (let i = 0; i < todayCourses.length; i++) {
      const [slotNumber, courseId] = todayCourses[i];
      const slotIndex = schedule.slotMapping[slotNumber];
      
      if (slotIndex === undefined || slotIndex >= currentTimeSlots.length) continue;
      
      const [startTime, endTime] = currentTimeSlots[slotIndex].split('-');
      const course = schedule.courses.find(c => c.id === courseId);

      if (!course) continue;

      const location = formatLocation(schedule.locations[course.locationIndex]);
      const courseInfo: Course = {
        name: course.name,
        time: `${startTime}-${endTime}`,
        location: location
      };

      if (currentTime >= startTime && currentTime < endTime) {
        currentCourse = courseInfo;
        // Find next course
        for (let j = i + 1; j < todayCourses.length; j++) {
          const [nextSlotNumber, nextCourseId] = todayCourses[j];
          const nextSlotIndex = schedule.slotMapping[nextSlotNumber];
          
          if (nextSlotIndex === undefined || nextSlotIndex >= currentTimeSlots.length) continue;
          
          const [nextStartTime, nextEndTime] = currentTimeSlots[nextSlotIndex].split('-');
          const nextCourseData = schedule.courses.find(c => c.id === nextCourseId);
          
          if (nextCourseData) {
            const nextLocation = formatLocation(schedule.locations[nextCourseData.locationIndex]);
            nextCourse = {
              name: nextCourseData.name,
              time: `${nextStartTime}-${nextEndTime}`,
              location: nextLocation
            };
            break;
          }
        }
        break;
      }

      if (currentTime < startTime) {
        nextCourse = courseInfo;
        break;
      }
    }

    return { current: currentCourse, next: nextCourse };
  }, [getCurrentTimeSlots]);

  const parseSchedule = useCallback(() => {
    if (scheduleData) {
      const now = new Date();
      const courseInfo = getCourseInfo(scheduleData, now);
      onParse(courseInfo);
      
      // Schedule next update
      const nextUpdate = getNextScheduleUpdate(scheduleData, now);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Add a small buffer to ensure time has passed
      timeoutRef.current = setTimeout(() => {
        parseSchedule();
      }, Math.max(nextUpdate + 1000, 60000)); // At least 1 minute between updates
    }
  }, [scheduleData, onParse, getCourseInfo, getNextScheduleUpdate]);

  useEffect(() => {
    parseSchedule();
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [parseSchedule]);

  return null;
};

export default CourseScheduleParser;
