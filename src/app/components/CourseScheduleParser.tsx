import React, { useState, useEffect, useCallback, useRef } from 'react';

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface Course {
  name: string;
  time: string;
  location: string;
  date?: string;
}

interface CourseData {
  id: number;
  name: string;
  locationIndex: number;
  weeks?: string;
  weekSlots?: {
    weeks: string;
    slots: string[];
  }[];
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
  courses: CourseData[];
  schedule: {
    [key: string]: [string, number][];
  };
  semesterInfo: {
    startDate: string;
    firstClassDate: string;
    firstClassPeriod: number;
    endDate: string;
    specialDates: {
      holidays: { start: string; end: string; name: string }[];
      militaryTraining: { start: string; end: string; name: string }[];
      examPeriod: { start: string; end: string; name: string }[];
    };
  };
}

interface CourseInfo {
  current: Course | null;
  next: Course | null;
}

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

  const getCurrentTimeSlots = useCallback((date: Date): string[] => {
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
  }, [scheduleData]);

  const formatLocation = (location: { building: string; room: string }): string => {
    if (!location.building && !location.room) return '';
    return location.room ? `${location.building}-${location.room}` : location.building;
  };

  const getWeekNumber = useCallback((date: Date): number => {
    if (!scheduleData) return 0;
    const startDate = new Date(scheduleData.semesterInfo.startDate);
    const diffTime = date.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 7);
  }, [scheduleData]);

  const parseWeekRange = (weekRange: string): { start: number; end: number } => {
    const [start, end] = weekRange.split('-').map(Number);
    return { start, end };
  };

  const isSpecialDate = useCallback((date: Date): string | null => {
    if (!scheduleData) return null;
    
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Check holidays
    for (const holiday of scheduleData.semesterInfo.specialDates.holidays) {
      const start = new Date(holiday.start);
      const end = new Date(holiday.end);
      if (dateOnly >= start && dateOnly <= end) {
        return holiday.name;
      }
    }
    
    // Check military training
    for (const training of scheduleData.semesterInfo.specialDates.militaryTraining) {
      const start = new Date(training.start);
      const end = new Date(training.end);
      if (dateOnly >= start && dateOnly <= end) {
        return training.name;
      }
    }
    
    // Check exam period
    for (const exam of scheduleData.semesterInfo.specialDates.examPeriod) {
      const start = new Date(exam.start);
      const end = new Date(exam.end);
      if (dateOnly >= start && dateOnly <= end) {
        return exam.name;
      }
    }
    
    return null;
  }, [scheduleData]);

  const isCourseActiveInWeek = useCallback((course: CourseData, weekNumber: number, slotNumber: string): boolean => {
    // Handle courses with weekSlots (variable slot schedules)
    if (course.weekSlots) {
      for (const weekSlot of course.weekSlots) {
        const { start, end } = parseWeekRange(weekSlot.weeks);
        if (weekNumber >= start && weekNumber <= end && weekSlot.slots.includes(slotNumber)) {
          return true;
        }
      }
      return false;
    }
    
    // Handle regular courses with weeks
    if (course.weeks) {
      const { start, end } = parseWeekRange(course.weeks);
      return weekNumber >= start && weekNumber <= end;
    }
    
    return true;
  }, []);

  const findNextCourse = useCallback((currentDate: Date): Course | null => {
    if (!scheduleData) return null;

    const utc8Date = isUTC8(currentDate) ? currentDate : convertToUTC8(currentDate);
    const currentWeek = getWeekNumber(utc8Date);
    const currentDay = utc8Date.getDay() === 0 ? 7 : utc8Date.getDay();
    const currentTime = utc8Date.toTimeString().slice(0, 5);
    const currentTimeSlots = getCurrentTimeSlots(utc8Date);
    
    // Check if before semester starts or classes have ended
    const semesterStart = new Date(scheduleData.semesterInfo.startDate);
    const firstClassDate = new Date(scheduleData.semesterInfo.firstClassDate);
    const semesterEnd = new Date(scheduleData.semesterInfo.endDate);
    
    if (utc8Date < firstClassDate) {
      // Find first class
      for (let day = 1; day <= 7; day++) {
        const dayCourses = scheduleData.schedule[day.toString()] || [];
        for (const [slotNumber, courseId] of dayCourses) {
          const course = scheduleData.courses.find(c => c.id === courseId);
          if (course && isCourseActiveInWeek(course, 4, slotNumber)) { // Week 4 is when most classes start
            const slotIndex = scheduleData.slotMapping[slotNumber];
            if (slotIndex !== undefined && slotIndex < currentTimeSlots.length) {
              const [startTime] = currentTimeSlots[slotIndex].split('-');
              const location = formatLocation(scheduleData.locations[course.locationIndex]);
              
              const classDate = new Date(firstClassDate);
              // Adjust to correct day of week
              const targetDayOffset = day - firstClassDate.getDay();
              classDate.setDate(classDate.getDate() + targetDayOffset);
              
              return {
                name: course.name,
                time: startTime,
                location: location,
                date: classDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
              };
            }
          }
        }
      }
    }
    
    if (utc8Date > semesterEnd) {
      return null; // Semester has ended
    }

    // Check remaining courses today
    const todayCourses = scheduleData.schedule[currentDay.toString()] || [];
    for (const [slotNumber, courseId] of todayCourses) {
      if (!isCourseActiveInWeek(scheduleData.courses.find(c => c.id === courseId)!, currentWeek, slotNumber)) {
        continue;
      }
      
      const slotIndex = scheduleData.slotMapping[slotNumber];
      if (slotIndex === undefined || slotIndex >= currentTimeSlots.length) continue;
      
      const [startTime, endTime] = currentTimeSlots[slotIndex].split('-');
      
      if (currentTime < startTime) {
        const course = scheduleData.courses.find(c => c.id === courseId);
        if (course) {
          const location = formatLocation(scheduleData.locations[course.locationIndex]);
          return {
            name: course.name,
            time: `${startTime}-${endTime}`,
            location: location
          };
        }
      }
    }

    // Look for next course in coming days
    for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
      const checkDate = new Date(utc8Date);
      checkDate.setDate(checkDate.getDate() + dayOffset);
      
      if (isSpecialDate(checkDate)) continue; // Skip special dates
      
      const checkWeek = getWeekNumber(checkDate);
      const checkDay = checkDate.getDay() === 0 ? 7 : checkDate.getDay();
      const dayCourses = scheduleData.schedule[checkDay.toString()] || [];
      
      for (const [slotNumber, courseId] of dayCourses) {
        const course = scheduleData.courses.find(c => c.id === courseId);
        if (course && isCourseActiveInWeek(course, checkWeek, slotNumber)) {
          const slotIndex = scheduleData.slotMapping[slotNumber];
          if (slotIndex !== undefined && slotIndex < currentTimeSlots.length) {
            const [startTime, endTime] = currentTimeSlots[slotIndex].split('-');
            const location = formatLocation(scheduleData.locations[course.locationIndex]);
            
            let dateStr = '';
            if (dayOffset === 1) {
              dateStr = '明天';
            } else {
              dateStr = checkDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
            }
            
            return {
              name: course.name,
              time: `${startTime}-${endTime}`,
              location: location,
              date: dateStr
            };
          }
        }
      }
    }

    return null;
  }, [scheduleData, getCurrentTimeSlots, getWeekNumber, isCourseActiveInWeek, isSpecialDate]);

  const getNextScheduleUpdate = useCallback((schedule: ScheduleData, date: Date): number => {
    const utc8Date = isUTC8(date) ? date : convertToUTC8(date);
    const day = utc8Date.getDay() === 0 ? 7 : utc8Date.getDay();
    const currentTime = utc8Date.toTimeString().slice(0, 5);
    const weekNumber = getWeekNumber(utc8Date);
    
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
      const course = schedule.courses.find(c => c.id === courseId);
      if (!course || !isCourseActiveInWeek(course, weekNumber, slotNumber)) {
        continue;
      }
      
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
  }, [getCurrentTimeSlots, getWeekNumber, isCourseActiveInWeek]);

  const getCourseInfo = useCallback((schedule: ScheduleData, date: Date): CourseInfo => {
    const utc8Date = isUTC8(date) ? date : convertToUTC8(date);
    
    // Check for special dates
    const specialType = isSpecialDate(utc8Date);
    if (specialType) {
      return { current: null, next: null };
    }

    const day = utc8Date.getDay() === 0 ? 7 : utc8Date.getDay();
    const currentTime = utc8Date.toTimeString().slice(0, 5);
    const weekNumber = getWeekNumber(utc8Date);
    
    const todayCourses = schedule.schedule[day];
    
    if (!todayCourses) return { current: null, next: findNextCourse(utc8Date) };

    const currentTimeSlots = getCurrentTimeSlots(utc8Date);
    let currentCourse: Course | null = null;
    let nextCourse: Course | null = null;

    for (let i = 0; i < todayCourses.length; i++) {
      const [slotNumber, courseId] = todayCourses[i];
      const course = schedule.courses.find(c => c.id === courseId);
      
      if (!course || !isCourseActiveInWeek(course, weekNumber, slotNumber)) {
        continue;
      }
      
      const slotIndex = schedule.slotMapping[slotNumber];
      
      if (slotIndex === undefined || slotIndex >= currentTimeSlots.length) continue;
      
      const [startTime, endTime] = currentTimeSlots[slotIndex].split('-');

      const location = formatLocation(schedule.locations[course.locationIndex]);
      const courseInfo: Course = {
        name: course.name,
        time: `${startTime}-${endTime}`,
        location: location
      };

      if (currentTime >= startTime && currentTime < endTime) {
        currentCourse = courseInfo;
        // Find next course today or in future
        nextCourse = findNextCourse(utc8Date);
        break;
      }

      if (currentTime < startTime) {
        nextCourse = courseInfo;
        break;
      }
    }

    // If no next course found today, look for future courses
    if (!nextCourse) {
      nextCourse = findNextCourse(utc8Date);
    }

    return { current: currentCourse, next: nextCourse };
  }, [getCurrentTimeSlots, getWeekNumber, isCourseActiveInWeek, findNextCourse, isSpecialDate]);

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
      
      // Add a small buffer to ensure time has passed, minimum 1 minute between updates
      timeoutRef.current = setTimeout(() => {
        parseSchedule();
      }, Math.max(nextUpdate + 1000, 60000));
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
