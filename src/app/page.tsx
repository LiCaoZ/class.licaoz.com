"use client";

import React, { useState } from 'react';
import CourseScheduleParser from './components/CourseScheduleParser';
import Footer from './components/Footer';

const App: React.FC = () => {
  interface Course {
    name: string;
    time: string;
    location: string;
  }

  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [nextCourse, setNextCourse] = useState<Course | null>(null);



  const handleParsedInfo = (info: { current: Course | null, next: Course | null }) => {
    console.log('Current course:', info.current);
    console.log('Next course:', info.next);

    setCurrentCourse(info.current);
    setNextCourse(info.next);
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] max-w-screen-lg mx-auto">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <div className="flex flex-col gap-4 items-center">
          <h1 className="text-4xl font-bold text-center">草纸现在在上什么课？</h1>
          <span className="text-lg text-center status">
            <p className='current'>
              {currentCourse ? 
                (currentCourse.location ? 
                  `草纸现在在${currentCourse.location}上${currentCourse.name}。` : 
                  `草纸现在在上${currentCourse.name}。`) : 
                '草纸现在不在上课。'}
            </p>
            <p className='next'>
              {nextCourse ? 
                (nextCourse.location ? 
                  `下节课是 ${nextCourse.time} 的${nextCourse.name}，位于${nextCourse.location}。` : 
                  `下节课是 ${nextCourse.time} 的${nextCourse.name}。`) : 
                '今天没有更多课了。'}
            </p>
          </span>
          <CourseScheduleParser onParse={handleParsedInfo} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
