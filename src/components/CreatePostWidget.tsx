import React, { useState, useRef } from 'react';
import { Image, Send, X, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const CreatePostWidget: React.FC = () => {
  const { currentUser, createActivity } = useApp();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<{file: File, preview: string}[]>([]);
  const imagesRef = useRef(images);
  
  React.useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  React.useEffect(() => {
    return () => {
      imagesRef.current.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, []);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const maxWords = 500;
  const maxImages = 3;
  const maxFileSize = 5 * 1024 * 1024; // 5MB

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const currentWords = text.trim() ? text.trim().split(/\s+/).length : 0;
    
    if (currentWords <= maxWords || text.length < content.length) {
      setContent(text);
      setError(null);
    } else {
      setError(`Maximum ${maxWords} words allowed.`);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!e.target.files) return;
    
    const newFiles = Array.from(e.target.files) as File[];
    
    if (images.length + newFiles.length > maxImages) {
      setError(`You can only upload up to ${maxImages} images.`);
      return;
    }

    const validFiles = newFiles.filter(file => {
      if (file.size > maxFileSize) {
        setError('Each image must be 5MB or less.');
        return false;
      }
      return true;
    });

    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[indexToRemove].preview);
      newImages.splice(indexToRemove, 1);
      return newImages;
    });
  };

  const handlePost = async () => {
    if (!content.trim() && images.length === 0) return;

    try {
      // In a real app, upload images to Firebase Storage and get URLs here
      // For simulation, we convert them to base64 Data URLs so they persist
      const imageUrls = await Promise.all(
        images.map((img) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(img.file);
          });
        })
      );

      createActivity({
        type: 'student_post',
        author: {
          id: currentUser.id,
          name: currentUser.name,
          headline: currentUser.headline,
          avatar: currentUser.avatar,
          college: currentUser.college
        },
        title: 'Shared an update',
        description: content.trim(),
        badgeText: currentUser.role === 'faculty' || currentUser.role === 'admin' ? ' Educator Post' : '💭 Student Post',
        badgeTheme: currentUser.role === 'faculty' || currentUser.role === 'admin' ? 'purple' : 'blue',
        metadata: {
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined
        }
      });

      setContent('');
      setImages([]);
      setError(null);
    } catch (err) {
      setError('Failed to post. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Create Post</h4>
      </div>
      
      <div className="flex gap-3">
        <img
          src={currentUser.avatar}
          alt={currentUser.name}
          className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
        />
        <div className="flex-1 space-y-3">
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="Share an update, project, or learning milestone..."
            className="w-full text-sm resize-none bg-transparent outline-hidden min-h-[60px]"
            rows={3}
          />
          
          {images.length > 0 && (
            <div className={`grid gap-2 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {images.map((img, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-black/5 dark:bg-zinc-900/50 w-full flex items-center justify-center">
                  <img 
                    src={img.preview} 
                    alt={`Preview ${idx + 1}`} 
                    className="w-full h-auto max-h-[550px] object-contain rounded-xl"
                  />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-rose-500 backdrop-blur-md text-white rounded-full transition-colors opacity-0 group-hover:opacity-100 shadow-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-1.5 text-rose-500 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageUpload}
                disabled={images.length >= maxImages}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= maxImages}
                className={`p-2 rounded-xl transition-colors ${
                  images.length >= maxImages 
                    ? 'text-slate-300 cursor-not-allowed' 
                    : 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
                title="Add Images (Max 3)"
              >
                <Image className="w-5 h-5" />
              </button>
              
              <span className={`text-[10px] font-medium ${wordCount > maxWords * 0.9 ? 'text-amber-500' : 'text-slate-400'}`}>
                {wordCount}/{maxWords} words
              </span>
            </div>

            <button
              onClick={handlePost}
              disabled={(!content.trim() && images.length === 0) || !!error}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <span>Post</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
