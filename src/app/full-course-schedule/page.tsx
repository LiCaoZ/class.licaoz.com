"use client";

import React from 'react';
import FullCourseScheduleTable from '../components/FullCourseScheduleTable';
import Footer from '../components/Footer';

const SchedulePage: React.FC = () => {
    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-4 pb-20 gap-8 sm:p-8 font-[family-name:var(--font-geist-sans)] max-w-screen-xl mx-auto">
          <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full">
            <div className="flex flex-col gap-4 items-center w-full">
              <h1 className="text-4xl font-bold text-center">完整课程表</h1>
              <div className="w-full">
                <FullCourseScheduleTable />
              </div>
            </div>
          </main>
          <Footer />
        </div>
      );
  };
  
  export default SchedulePage;
