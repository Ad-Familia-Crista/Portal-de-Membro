import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ZoomIn, ZoomOut, RotateCcw, Check, Move } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onCropComplete: (croppedDataUrl: string) => void;
  onClose: () => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  onCropComplete,
  onClose
}) => {
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  
  const containerRef = React.useRef<HTMLDivElement>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);

  // Reset state when opening a new image
  React.useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y
    });
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (containerRef.current && containerRef.current.hasPointerCapture(e.pointerId)) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.min(Math.max(0.5, prev + zoomDelta), 3.5));
  };

  const handleConfirmCrop = () => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    const outputSize = 400; // Resolução otimizada e ultra-leve para documento 3x3
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Viewport box size inside container
    const cropSize = Math.min(containerRect.width, containerRect.height);

    // Image natural dimensions
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    // Dimensions rendered at zoom = 1 (object-contain behavior relative to crop viewport)
    const baseScale = Math.min(cropSize / naturalWidth, cropSize / naturalHeight);
    const renderedWidth = naturalWidth * baseScale * zoom;
    const renderedHeight = naturalHeight * baseScale * zoom;

    // Center coordinates with offset
    const centerX = cropSize / 2 + offset.x;
    const centerY = cropSize / 2 + offset.y;

    const drawX = centerX - renderedWidth / 2;
    const drawY = centerY - renderedHeight / 2;

    // Scale mapping to output canvas
    const scaleFactor = outputSize / cropSize;

    // Clear and fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, outputSize, outputSize);

    // Draw transformed image
    ctx.drawImage(
      img,
      drawX * scaleFactor,
      drawY * scaleFactor,
      renderedWidth * scaleFactor,
      renderedHeight * scaleFactor
    );

    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.82);
    onCropComplete(croppedBase64);
    onClose();
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajustar Enquadramento da Foto"
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
          <Button variant="outline" className="border-black text-black hover:bg-black/10 w-full sm:w-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmCrop} className="bg-black text-white hover:bg-black/90 flex items-center justify-center gap-2 w-full sm:w-auto">
            <Check className="w-4 h-4" /> Confirmar Enquadramento
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-muted">
          Arraste a foto para posicionar o rosto no centro e use o controle de zoom para ajustar o enquadramento 3x3.
        </p>

        {/* Viewport de recorte com guia 3x3 */}
        <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px] aspect-square bg-neutral-900 rounded-xl overflow-hidden shadow-inner select-none cursor-grab active:cursor-grabbing border border-muted/20">
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            className="w-full h-full flex items-center justify-center relative touch-none"
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Foto para recorte"
              draggable={false}
              className="max-w-none transition-transform duration-75 origin-center pointer-events-none select-none"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                maxHeight: '100%',
                maxWidth: '100%',
                objectFit: 'contain'
              }}
            />
          </div>

          {/* Guia de enquadramento (Overlays e Grade de Terços) */}
          <div className="absolute inset-0 pointer-events-none border-2 border-white/80 rounded-lg">
            {/* Linhas de grade sutis */}
            <div className="absolute inset-x-0 top-1/3 border-b border-white/20" />
            <div className="absolute inset-x-0 top-2/3 border-b border-white/20" />
            <div className="absolute inset-y-0 left-1/3 border-r border-white/20" />
            <div className="absolute inset-y-0 left-2/3 border-r border-white/20" />
            
            {/* Guia oval para o rosto */}
            <div className="absolute inset-6 border border-dashed border-secondary/70 rounded-full opacity-60" />
          </div>

          {/* Dica de arraste flutuante */}
          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-white/80 flex items-center gap-1 pointer-events-none">
            <Move className="w-3 h-3" /> Arraste para mover
          </div>
        </div>

        {/* Controles de Zoom */}
        <div className="flex items-center gap-3 px-2 pt-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
            className="p-2 hover:bg-muted/10 rounded text-muted hover:text-black transition-colors cursor-pointer"
            title="Diminuir Zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <input
            type="range"
            min="0.5"
            max="3.5"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1 accent-black cursor-pointer h-2 bg-muted/20 rounded-lg"
          />

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3.5, z + 0.15))}
            className="p-2 hover:bg-muted/10 rounded text-muted hover:text-black transition-colors cursor-pointer"
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-2 hover:bg-muted/10 rounded text-muted hover:text-black transition-colors cursor-pointer ml-1"
            title="Redefinir Posição e Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
