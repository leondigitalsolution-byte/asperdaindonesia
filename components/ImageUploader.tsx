import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface Props {
  image: string | null;
  onImageChange: (image: string | null) => void;
  label?: string;
  placeholder?: string;
  aspectRatio?: 'square' | 'video' | 'auto';
  className?: string;
}

export const ImageUploader: React.FC<Props> = ({ 
  image, 
  onImageChange, 
  label, 
  placeholder = "Upload Image", 
  aspectRatio = 'video',
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const ratioClass = aspectRatio === 'square' ? 'aspect-square' : aspectRatio === 'video' ? 'aspect-video' : '';

  return (
    <div className={className}>
      {label && <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer overflow-hidden flex flex-col items-center justify-center ${ratioClass} ${!image ? 'p-6' : ''}`}
      >
        {image ? (
          <>
            <img src={image} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <button 
                    onClick={handleRemove}
                    className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                >
                    <X size={20}/>
                </button>
            </div>
          </>
        ) : (
          <div className="text-center text-slate-400">
            <Upload className="mx-auto mb-2" size={24} />
            <span className="text-xs font-medium">{placeholder}</span>
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileChange} 
        />
      </div>
    </div>
  );
};