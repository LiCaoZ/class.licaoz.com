import React, { useState, useEffect } from 'react';

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

interface CourseCell {
    name: string;
    location: string;
    slotNumber?: string;
}

const FullCourseScheduleTable: React.FC = () => {
    const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
    const [fetchError, setFetchError] = useState<boolean>(false);

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                const response = await fetch('/course-schedule.json');
                const data: ScheduleData = await response.json();
                setScheduleData(data);
            } catch (error) {
                console.error('Failed to fetch schedule:', error);
                setFetchError(true);
            }
        };

        fetchSchedule();
    }, []);

    const getDayName = (day: number): string => {
        const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        return days[day - 1];
    };

    const getCurrentTimeSlots = (): string[] => {
        if (!scheduleData) return [];
        
        // Summer schedule: from first Monday in May until first Monday in October  
        // Autumn/Winter schedule: from first Monday in October until first Monday in May (next year)
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-11
        
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
        if (now >= summerStart && now < summerEnd) {
            return scheduleData.timeSlots.summer;
        } else {
            return scheduleData.timeSlots.autumn;
        }
    };

    const formatLocation = (location: { building: string; room: string }): string => {
        return location.room ? `${location.building}-${location.room}` : location.building;
    };

    const createScheduleGrid = (): (CourseCell | null)[][] => {
        if (!scheduleData) return [];

        const currentTimeSlots = getCurrentTimeSlots();
        const grid: (CourseCell | null)[][] = [];

        // Create a complete list of all possible slot numbers for the grid
        const allSlotNumbers = Object.keys(scheduleData.slotMapping).sort((a, b) => {
            return scheduleData.slotMapping[a] - scheduleData.slotMapping[b];
        });

        for (let day = 1; day <= 7; day++) {
            const daySchedule: (CourseCell | null)[] = [];
            const dayCourses = scheduleData.schedule[day.toString()] || [];

            allSlotNumbers.forEach((slotNumber) => {
                const courseSlot = dayCourses.find(([slot]) => slot === slotNumber);

                if (courseSlot) {
                    const [, courseId] = courseSlot;
                    const course = scheduleData.courses.find(c => c.id === courseId);
                    if (course) {
                        daySchedule.push({
                            name: course.name,
                            location: formatLocation(scheduleData.locations[course.locationIndex]),
                            slotNumber: slotNumber
                        });
                    } else {
                        daySchedule.push(null);
                    }
                } else {
                    daySchedule.push(null);
                }
            });

            grid.push(daySchedule);
        }

        return grid;
    };

    if (fetchError) {
        return <div className="text-gray-800 dark:text-gray-200">课程表数据文件损坏或丢失。</div>;
    }

    if (!scheduleData) {
        return <div className="text-gray-200 dark:text-gray-300">Loading...</div>;
    }

    const scheduleGrid = createScheduleGrid();
    const currentTimeSlots = getCurrentTimeSlots();
    const allSlotNumbers = Object.keys(scheduleData?.slotMapping || {}).sort((a, b) => {
        return (scheduleData?.slotMapping[a] || 0) - (scheduleData?.slotMapping[b] || 0);
    });

    return (
        <div className="w-full">
            <div className="overflow-x-auto border border-gray-300 dark:border-gray-700 rounded-lg">
                <table className="w-full bg-white dark:bg-gray-800 text-sm min-w-[800px]">
                    <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                            <th className="py-2 px-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 min-w-[80px]">节次/时间</th>
                            {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                <th key={day} className="py-2 px-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 min-w-[120px]">{getDayName(day)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {allSlotNumbers.map((slotNumber, slotIndex) => (
                            <tr key={slotNumber} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="py-2 px-2 border border-gray-300 dark:border-gray-600 font-medium text-center bg-gray-50 dark:bg-gray-800">
                                    <div className="text-gray-800 dark:text-gray-200">第{slotNumber}节</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {currentTimeSlots[scheduleData?.slotMapping[slotNumber] || 0] || ''}
                                    </div>
                                </td>
                                {scheduleGrid.map((day, dayIndex) => (
                                    <td key={dayIndex} className="py-2 px-2 border border-gray-300 dark:border-gray-600">
                                        {day[slotIndex] ? (
                                            <div className="space-y-1">
                                                <div className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{day[slotIndex]?.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-500">{day[slotIndex]?.location}</div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 dark:text-gray-600">-</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FullCourseScheduleTable;
