import React, { useState, useEffect } from 'react';

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

const CourseScheduleParser: React.FC<{ onParse: (info: CourseInfo) => void }> = ({ onParse }) => {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);

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

  useEffect(() => {
    const getCurrentTimeSlots = (date: Date): string[] => {
      if (!scheduleData) return [];
      
      // Summer schedule: from first Monday in May until first Monday in October
      // Autumn/Winter schedule: from first Monday in October until first Monday in May (next year)
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11
      const dayOfMonth = date.getDate();
      const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc.
      
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
      return location.room ? `${location.building}-${location.room}` : location.building;
    };

    const getCourseInfo = (schedule: ScheduleData, date: Date): CourseInfo => {
      const utc8Date = isUTC8(date) ? date : convertToUTC8(date);
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

        const courseInfo: Course = {
          name: course.name,
          time: `${startTime}-${endTime}`,
          location: formatLocation(schedule.locations[course.locationIndex])
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
              nextCourse = {
                name: nextCourseData.name,
                time: `${nextStartTime}-${nextEndTime}`,
                location: formatLocation(schedule.locations[nextCourseData.locationIndex])
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
    };

    const parseSchedule = () => {
      if (scheduleData) {
        const courseInfo = getCourseInfo(scheduleData, new Date());
        onParse(courseInfo);
      }
    };

    parseSchedule();
  }, [scheduleData, onParse]);

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

  return null;
};

export default CourseScheduleParser;
