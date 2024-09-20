"use client";

import React, { useState } from 'react';
import CourseScheduleParser from './components/CourseScheduleParser';

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

    if (info.current) {
      if (info.current.time === "07:30-07:50") {
        info.current.name = info.current.name + "早读";
      } else if (info.current.time === "13:10-13:40") {
        info.current.name = info.current.name + "午自习";
      }
    }

    if (info.next) {
      if (info.next.time === "07:30-07:50") {
        info.next.name = info.next.name + "早读";
      } else if (info.next.time === "13:10-13:40") {
        info.next.name = info.next.name + "午自习";
      }
    }

    setCurrentCourse(info.current);
    setNextCourse(info.next);
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <div className="flex flex-col gap-4 items-center">
          <h1 className="text-4xl font-bold text-center">草纸现在在上什么课？</h1>
          <span className="text-lg text-center status">
            <p className='current'>
              {currentCourse ? `草纸现在在${currentCourse.location}上${currentCourse.name}。` : '草纸现在不在上课。'}
            </p>
            <p className='next'>
              {nextCourse ? `下节课是 ${nextCourse.time} 的${nextCourse.name}，位于${nextCourse.location}。` : '今天没有下节课了。'}
            </p>
          </span>
          <CourseScheduleParser onParse={handleParsedInfo} />
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <p className='text-md desc'>Made with LOVE by <b><a href='https://caozhi.li'>Caozhi Li</a></b>, from CKG, CHN.</p>
        <p className='text-sm desc'>※ 若你的时区并非中国标准时间 [(UTC+08:00) 北京，重庆，香港，乌鲁木齐] 或其他东八区时间，课程显示可能有误。</p>
      </footer>
    </div>
  );
};

export default App;
