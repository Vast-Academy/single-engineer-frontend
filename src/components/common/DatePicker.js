import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DatePicker = ({ value, onChange, minDate, placeholder = 'Select date' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const containerRef = useRef(null);

    // Parse min date
    const minDateObj = minDate ? new Date(minDate) : null;
    if (minDateObj) {
        minDateObj.setHours(0, 0, 0, 0);
    }

    // Generate years (current year to +5 years)
    const years = [];
    const thisYear = new Date().getFullYear();
    for (let i = thisYear; i <= thisYear + 5; i++) {
        years.push(i);
    }

    // Set initial month/year when value changes
    useEffect(() => {
        if (value) {
            const date = new Date(value);
            setCurrentMonth(date.getMonth());
            setCurrentYear(date.getFullYear());
        }
    }, [value]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Get days in month
    const getDaysInMonth = (month, year) => {
        return new Date(year, month + 1, 0).getDate();
    };

    // Get first day of month (0 = Sunday)
    const getFirstDayOfMonth = (month, year) => {
        return new Date(year, month, 1).getDay();
    };

    // Check if date is disabled
    const isDateDisabled = (day) => {
        if (!minDateObj) return false;
        const date = new Date(currentYear, currentMonth, day);
        date.setHours(0, 0, 0, 0);
        return date < minDateObj;
    };

    // Check if date is selected
    const isDateSelected = (day) => {
        if (!value) return false;
        const selected = new Date(value);
        return (
            selected.getDate() === day &&
            selected.getMonth() === currentMonth &&
            selected.getFullYear() === currentYear
        );
    };

    // Check if date is today
    const isToday = (day) => {
        const today = new Date();
        return (
            today.getDate() === day &&
            today.getMonth() === currentMonth &&
            today.getFullYear() === currentYear
        );
    };

    // Handle date selection
    const handleDateClick = (day) => {
        if (isDateDisabled(day)) return;

        const date = new Date(currentYear, currentMonth, day);
        const formattedDate = date.toISOString().split('T')[0];
        onChange(formattedDate);
        setIsOpen(false);
    };

    // Navigate months
    const goToPrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const goToNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    // Check if prev month is allowed
    const canGoPrev = () => {
        if (!minDateObj) return true;
        const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
        const minMonthDate = new Date(minDateObj.getFullYear(), minDateObj.getMonth(), 1);
        return prevMonthDate >= minMonthDate;
    };

    // Format display value
    const formatDisplayValue = () => {
        if (!value) return '';
        const date = new Date(value);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Generate calendar grid
    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentMonth, currentYear);
        const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
        const days = [];

        // Empty cells for days before first day of month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="w-10 h-10"></div>);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const disabled = isDateDisabled(day);
            const selected = isDateSelected(day);
            const today = isToday(day);

            days.push(
                <button
                    key={day}
                    type="button"
                    onClick={() => handleDateClick(day)}
                    disabled={disabled}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                        selected
                            ? 'bg-primary-500 text-white'
                            : today
                                ? 'bg-primary-100 text-primary-700'
                                : disabled
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                    {day}
                </button>
            );
        }

        return days;
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Input Field */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 cursor-pointer flex items-center justify-between bg-white"
            >
                <span className={value ? 'text-gray-800' : 'text-gray-400'}>
                    {value ? formatDisplayValue() : placeholder}
                </span>
                <Calendar className="w-5 h-5 text-gray-400" />
            </div>

            {/* Calendar Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-50 p-4">
                    {/* Month/Year Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={goToPrevMonth}
                            disabled={!canGoPrev()}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>

                        <div className="flex items-center gap-2">
                            {/* Month Dropdown */}
                            <select
                                value={currentMonth}
                                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                                className="bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 cursor-pointer focus:outline-none focus:border-primary-400 rounded-lg px-2 py-1.5"
                            >
                                {MONTHS.map((month, index) => (
                                    <option key={month} value={index}>
                                        {month}
                                    </option>
                                ))}
                            </select>

                            {/* Year Dropdown */}
                            <select
                                value={currentYear}
                                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                                className="bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 cursor-pointer focus:outline-none focus:border-primary-400 rounded-lg px-2 py-1.5"
                            >
                                {years.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={goToNextMonth}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>

                    {/* Day Names */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAYS.map((day) => (
                            <div
                                key={day}
                                className="w-10 h-8 flex items-center justify-center text-xs font-medium text-gray-500"
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {renderCalendar()}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 mt-4 pt-3 border-t">
                        <button
                            type="button"
                            onClick={() => {
                                const today = new Date();
                                if (!minDateObj || today >= minDateObj) {
                                    onChange(today.toISOString().split('T')[0]);
                                    setIsOpen(false);
                                }
                            }}
                            className="flex-1 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                onChange(tomorrow.toISOString().split('T')[0]);
                                setIsOpen(false);
                            }}
                            className="flex-1 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg"
                        >
                            Tomorrow
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatePicker;
