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
  timeSlots: string[];
  locations: string[];
  courses: {
    id: number;
    name: string;
    teacher: string;
    locationIndex: number;
  }[];
  schedule: {
    [key: string]: [number, number][];
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
    const parseSchedule = () => {
      if (scheduleData) {
        const courseInfo = getCourseInfo(scheduleData, new Date());
        onParse(courseInfo);
      }
    };

    parseSchedule();
  }, [scheduleData, onParse]);

  const getCourseInfo = (schedule: ScheduleData, date: Date): CourseInfo => {
    const day = date.getDay() === 0 ? 7 : date.getDay();
    const currentTime = date.toTimeString().slice(0, 5);
    
    const todayCourses = schedule.schedule[day];
    
    if (!todayCourses) return { current: null, next: null };

    let currentCourse: Course | null = null;
    let nextCourse: Course | null = null;

    for (let i = 0; i < todayCourses.length; i++) {
      const [timeSlotIndex, courseId] = todayCourses[i];
      const [startTime, endTime] = schedule.timeSlots[timeSlotIndex].split('-');
      const course = schedule.courses.find(c => c.id === courseId);

      if (!course) continue;

      const courseInfo: Course = {
        name: course.name,
        time: `${startTime}-${endTime}`,
        location: schedule.locations[course.locationIndex]
      };

      if (currentTime >= startTime && currentTime < endTime) {
        currentCourse = courseInfo;
        if (i < todayCourses.length - 1) {
          const [nextTimeSlotIndex, nextCourseId] = todayCourses[i + 1];
          const [nextStartTime, nextEndTime] = schedule.timeSlots[nextTimeSlotIndex].split('-');
          const nextCourseData = schedule.courses.find(c => c.id === nextCourseId);
          if (nextCourseData) {
            nextCourse = {
              name: nextCourseData.name,
              time: `${nextStartTime}-${nextEndTime}`,
              location: schedule.locations[nextCourseData.locationIndex]
            };
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

  return null;
};

export default CourseScheduleParser;
