"use client";

import { useEffect, useRef, useState } from "react";
import panzoom from "panzoom";

export default function ImageViewer({
  imageSrc,
  alt = "Image",
  cards = [],
  currentCardCode = null,
  onCardChange = null,
  onExitZoomMode = null
}) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const panzoomRef = useRef(null);
  const isZoomModeRef = useRef(false);
  const [isZoomMode, setIsZoomMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    isZoomModeRef.current = isZoomMode;

    if (isZoomMode && containerRef.current) {
      // Entering zoom mode - focus container
      containerRef.current.focus();
    } else if (!isZoomMode) {
      // Exiting zoom mode - focus barcode input & clear it
      const barcodeInput = document.querySelector('input[placeholder*="Quét"]');
      if (barcodeInput) {
        barcodeInput.focus();
      }
      if (onExitZoomMode) {
        onExitZoomMode();
      }
    }
  }, [isZoomMode]);

  // Initialize panzoom
  useEffect(() => {
    if (!imgRef.current || !imageSrc) return;

    if (panzoomRef.current) {
      panzoomRef.current.dispose();
    }

    const instance = panzoom(imgRef.current, {
      minZoom: 1,
      maxZoom: 5,
      smoothScroll: false,
      onUpdated: (e) => {
        setZoomLevel(e.getTransform().scale);
      },
    });

    panzoomRef.current = instance;

    return () => {
      if (panzoomRef.current) {
        panzoomRef.current.dispose();
        panzoomRef.current = null;
      }
    };
  }, [imageSrc]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Alt+1 = Toggle zoom mode
      if (e.ctrlKey && e.altKey && e.key === "1") {
        e.preventDefault();
        setIsZoomMode(!isZoomMode);
        return;
      }

      // Arrow keys - different behavior based on zoom mode
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        if (isZoomModeRef.current && panzoomRef.current) {
          // Zoom mode: Pan image
          e.preventDefault();
          const transform = panzoomRef.current.getTransform();
          const panAmount = e.key === "ArrowUp" ? 50 : -50;
          panzoomRef.current.pan(transform.x, transform.y + panAmount, false);
        } else if (!isZoomModeRef.current && cards.length > 0 && onCardChange) {
          // Not zoom mode: Navigate cards
          e.preventDefault();
          const currentIndex = cards.findIndex(c => c.code === currentCardCode);
          let nextIndex = currentIndex;

          if (e.key === "ArrowUp") {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : cards.length - 1;
          } else {
            nextIndex = currentIndex < cards.length - 1 ? currentIndex + 1 : 0;
          }

          onCardChange(cards[nextIndex].code);
        }
        return;
      }

      if (!isZoomModeRef.current || !panzoomRef.current) return;

      const transform = panzoomRef.current.getTransform();
      if (!transform || typeof transform.scale !== 'number') return;

      // +/= key = Zoom in
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        const newScale = Math.min(5, transform.scale * 1.2);
        try {
          panzoomRef.current.smoothZoom(newScale, false);
        } catch (err) {
          // Suppress animation error
        }
      }
      // - key = Zoom out
      else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        const newScale = Math.max(1, transform.scale * 0.8);
        try {
          panzoomRef.current.smoothZoom(newScale, false);
        } catch (err) {
          // Suppress animation error
        }
      }
      // Arrow left/right = Pan
      else if (e.key === "ArrowLeft") {
        e.preventDefault();
        panzoomRef.current.pan(transform.x + 50, transform.y, false);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        panzoomRef.current.pan(transform.x - 50, transform.y, false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZoomMode, cards, currentCardCode, onCardChange]);

  if (!imageSrc) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-900 rounded-lg">
        <p className="text-gray-500 text-xl">Chọn card để xem ảnh to</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden flex flex-col"
      style={{
        height: 'calc(100dvh - 220px)',
        backgroundColor: "lab(74 0 -0.01)"
      }}
    >
      <div
        ref={containerRef}
        className="w-full flex-1 overflow-hidden focus:outline-none"
        style={{
          touchAction: "none",
          backgroundColor: "lab(74 0 -0.01)"
        }}
        tabIndex={0}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          className="w-full h-full object-contain select-none cursor-grab"
          draggable={false}
        />
      </div>

      {/* Zoom mode indicator */}
      {isZoomMode && (
        <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-2 rounded text-sm font-semibold z-10">
          🔍 Zoom Mode
        </div>
      )}

      {/* Keyboard help */}
      {isZoomMode && (
        <div className="absolute bottom-4 left-4 bg-gray-800/80 text-gray-300 px-3 py-2 rounded text-xs z-10">
          <div>+/- = Zoom in/out</div>
          <div>↑↓←→ = Pan</div>
        </div>
      )}

      {/* Toggle instructions */}
      {!isZoomMode && (
        <div className="absolute bottom-4 right-4 bg-gray-800/80 text-gray-300 px-3 py-2 rounded text-xs">
          Ctrl+Alt+1: Zoom Mode
        </div>
      )}
    </div>
  );
}
