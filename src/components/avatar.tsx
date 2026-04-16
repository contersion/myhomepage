"use client";

interface AvatarProps {
  url?: string | null;
  shape?: string;
  className?: string;
}

const SHAPE_MAP: Record<string, string> = {
  circle: "rounded-full",
  "rounded-xl": "rounded-xl",
  "rounded-2xl": "rounded-2xl",
};

export default function Avatar({ url, shape = "circle", className = "" }: AvatarProps) {
  const radiusClass = SHAPE_MAP[shape] || SHAPE_MAP.circle;
  const baseClasses = `w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 overflow-hidden shadow-lg ${radiusClass}`;

  if (url) {
    return (
      <div className={`${baseClasses} ${className}`}>
        <img src={url} alt="avatar" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white ${className}`}
    >
      ME
    </div>
  );
}
