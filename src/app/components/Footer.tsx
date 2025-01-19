import Link from 'next/link';

const Footer = () => {
    return (
        <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
            <p className='text-md'><a href="/">[家]</a> <a href="/full-course-schedule">[完整的课程表]</a></p>
            <p className='text-md desc'>Made with LOVE by <b><a href='https://caozhi.li'>Caozhi Li</a></b>, from CKG, CHN.</p>
            <p className='text-sm desc'>※ 课程时间已转换为中国标准时间 [(UTC+08:00) 北京，重庆，香港，乌鲁木齐] 或其他东八区时间，以确保显示准确。</p>
        </footer>
    );
};

export default Footer;
