import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  showText?: boolean;
  priority?: boolean;
}

export function Logo({ className = '', showText = false, priority = true }: LogoProps) {
  // Original aspect ratio is 200:163 (width:height)
  // We'll maintain this ratio while scaling

  return (
    <Link href="/" className={`inline-block ${className}`}>
      <div className="flex flex-col items-center">
        <div className="relative w-[100px] h-[82px] sm:w-[150px] sm:h-[122px] md:w-[180px] md:h-[147px] lg:w-[200px] lg:h-[163px]">
          <Image
            src="/logo.png"
            alt="Misión ID - Heart for Africa"
            fill
            sizes="(max-width: 640px) 100px, (max-width: 768px) 150px, (max-width: 1024px) 180px, 200px"
            priority={priority}
            className="object-contain"
          />
        </div>
        {showText && (
          <span className="mt-1 text-sm sm:text-base md:text-lg font-semibold text-brand-indigo">
            Heart for Africa
          </span>
        )}
      </div>
    </Link>
  );
}
