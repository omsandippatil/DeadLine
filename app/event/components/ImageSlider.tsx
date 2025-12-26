"use client";

import React, { useState, useRef, useEffect } from 'react';

interface ImageSliderProps {
  images: string[];
}

export default function ImageSlider({ images }: ImageSliderProps) {
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});
  const sliderRef = useRef<HTMLDivElement>(null);
  const [extendedImages, setExtendedImages] = useState<string[]>([]);

  useEffect(() => {
    if (images && images.length > 0) {
      // Create infinite scroll by duplicating images
      const duplicated = [...images, ...images, ...images];
      setExtendedImages(duplicated);
      
      // Initialize loading state for all images
      const loadingState: Record<number, boolean> = {};
      duplicated.forEach((_, idx) => {
        loadingState[idx] = true;
      });
      setImageLoading(loadingState);
    }
  }, [images]);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider || extendedImages.length === 0) return;

    const handleScroll = () => {
      const slideWidth = 280;
      const gap = 12;
      const itemWidth = slideWidth + gap;
      const scrollLeft = slider.scrollLeft;
      const maxScroll = slider.scrollWidth - slider.clientWidth;
      const sectionWidth = images.length * itemWidth;

      // When scrolling right past the second set
      if (scrollLeft >= sectionWidth * 2 - itemWidth) {
        slider.scrollLeft = sectionWidth;
      }
      // When scrolling left before the first set
      else if (scrollLeft <= itemWidth) {
        slider.scrollLeft = sectionWidth + itemWidth;
      }
    };

    slider.addEventListener('scroll', handleScroll);
    
    // Start at the middle section
    setTimeout(() => {
      if (slider) {
        const slideWidth = 280;
        const gap = 12;
        const itemWidth = slideWidth + gap;
        slider.scrollLeft = images.length * itemWidth;
      }
    }, 100);

    return () => slider.removeEventListener('scroll', handleScroll);
  }, [extendedImages, images.length]);

  const handleImageError = (index: number) => {
    setImageErrors(prev => ({ ...prev, [index]: true }));
    setImageLoading(prev => ({ ...prev, [index]: false }));
  };

  const handleImageLoad = (index: number) => {
    setImageLoading(prev => ({ ...prev, [index]: false }));
  };

  if (!images || images.length === 0) {
    return (
      <section className="mb-6">
        <h3 className="text-lg font-bold uppercase tracking-tight mb-3 border-b-2 border-black pb-2 text-black">
          Image Gallery
        </h3>
        <div className="text-center py-6 text-gray-400">
          <p className="text-sm">No images to display</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <h3 className="text-lg font-bold uppercase tracking-tight mb-3 border-b-2 border-black pb-2 text-black">
        Image Gallery
      </h3>
      <div className="relative">
        <div
          ref={sliderRef}
          className="flex overflow-x-auto gap-3 pb-3 scrollbar-hide cursor-grab active:cursor-grabbing"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {extendedImages.map((image, index) => (
            !imageErrors[index] && (
              <div
                key={`image-${index}`}
                className="flex-shrink-0 w-70 h-52 bg-gray-50 overflow-hidden relative border border-gray-200"
              >
                {imageLoading[index] && (
                  <div className="absolute inset-0 bg-gray-200 animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer"></div>
                  </div>
                )}
                <img
                  src={image}
                  alt={`Gallery image ${(index % images.length) + 1}`}
                  className="w-full h-full object-cover select-none"
                  style={{ display: imageLoading[index] ? 'none' : 'block' }}
                  onLoad={() => handleImageLoad(index)}
                  onError={() => handleImageError(index)}
                  draggable={false}
                  loading="lazy"
                />
              </div>
            )
          ))}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </section>
  );
}