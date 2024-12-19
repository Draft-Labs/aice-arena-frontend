import { useState } from 'react';
import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-toastify';
import '../styles/ProfileImageUpload.css';

const ProfileImageUpload = ({ account, currentImageUrl, onImageUpdate }) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    try {
      setIsUploading(true);
      
      // Create a reference to the file in Firebase Storage
      const storageRef = ref(storage, `profileImages/${account.toLowerCase()}`);
      
      // Upload the file
      await uploadBytes(storageRef, file);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Call the callback with the new image URL
      onImageUpdate(downloadURL);
      
      toast.success('Profile image updated successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="profile-image-upload">
      <div className="profile-image-container">
        {currentImageUrl ? (
          <img 
            src={currentImageUrl} 
            alt="Profile" 
            className="profile-image-preview"
          />
        ) : (
          <svg 
            className="profile-image-preview default-avatar"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
          </svg>
        )}
      </div>
      <label className="upload-button" htmlFor="profile-image-input">
        {isUploading ? 'Uploading...' : 'Change Photo'}
      </label>
      <input
        type="file"
        id="profile-image-input"
        accept="image/*"
        onChange={handleImageUpload}
        disabled={isUploading}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default ProfileImageUpload; 