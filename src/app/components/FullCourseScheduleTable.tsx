import React, { useState, useEffect } from 'react';

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

interface CourseCell {
    name: string;
    teacher: string;
    location: string;
}

const FullCourseScheduleTable: React.FC = () => {
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

    const getDayName = (day: number): string => {
        const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        return days[day - 1];
    };

    const createScheduleGrid = (): (CourseCell | null)[][] => {
        if (!scheduleData) return [];

        const grid: (CourseCell | null)[][] = [];

        for (let day = 1; day <= 7; day++) {
            const daySchedule: (CourseCell | null)[] = [];
            const dayCourses = scheduleData.schedule[day.toString()] || [];

            scheduleData.timeSlots.forEach((timeSlot, timeSlotIndex) => {
                const courseSlot = dayCourses.find(([slotIndex]) => slotIndex === timeSlotIndex);

                if (courseSlot) {
                    const [, courseId] = courseSlot;
                    const course = scheduleData.courses.find(c => c.id === courseId);
                    if (course) {
                        let courseName = course.name;

                        // Add suffix based on time and day
                        if (timeSlot === "07:30-07:50") {
                            courseName += "早读";
                        } else if (timeSlot === "13:10-13:40") {
                            courseName += "午自习";
                        } else if (day != 7 && timeSlot === "21:20-22:00") {
                            courseName += "考练";
                        } else if ((day === 1 && timeSlot === "16:25-17:05") ||
                            (day === 7 && (timeSlot === "19:40-20:20" || timeSlot === "20:30-21:10"))) {
                            courseName += "考练";
                        }

                        daySchedule.push({
                            name: courseName,
                            teacher: course.teacher,
                            location: scheduleData.locations[course.locationIndex]
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

    if (!scheduleData) {
        return <div className="text-gray-200 dark:text-gray-300">Loading...</div>;
    }

    const scheduleGrid = createScheduleGrid();

    return (
        <div className="p-4">
            <div className="table-container">
                <table className="table bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
                    <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                            {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                <th key={day} className="py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200">{getDayName(day)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {scheduleData.timeSlots.map((_, timeIndex) => (
                            <tr key={timeIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                {scheduleGrid.map((day, dayIndex) => (
                                    <td key={dayIndex} className="py-2 px-4 border border-gray-300 dark:border-gray-600">
                                        {day[timeIndex] ? (
                                            <>
                                                <div className="font-semibold text-gray-800 dark:text-gray-200">{day[timeIndex]?.name}</div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">{day[timeIndex]?.teacher}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-500">{day[timeIndex]?.location}</div>
                                            </>
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
