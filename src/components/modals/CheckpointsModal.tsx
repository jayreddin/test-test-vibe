import React, { useState } from 'react';
import { X, Check, RefreshCw, Calendar, Clock } from 'lucide-react';
import { useAtom } from 'jotai';
import { checkpointsAtom, filesAtom, checkpointsModalOpenAtom, Checkpoint } from '../../atoms';

interface CheckpointsModalProps {
  onClose: () => void;
}

const CheckpointsModal: React.FC<CheckpointsModalProps> = ({ onClose }) => {
  const [checkpoints] = useAtom(checkpointsAtom);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [, setFiles] = useAtom(filesAtom);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleRestore = (checkpointId: string) => {
    setSelectedCheckpoint(checkpointId);
    setShowConfirm(true);
  };

  const confirmRestore = () => {
    if (!selectedCheckpoint) return;

    setIsRestoring(true);
    
    // Find the selected checkpoint
    const checkpoint = checkpoints.find(cp => cp.id === selectedCheckpoint);
    
    if (checkpoint) {
      // Update the files with the checkpoint files
      setFiles([...checkpoint.files]);
      
      // Simulate a delay for better UX
      setTimeout(() => {
        setIsRestoring(false);
        setShowConfirm(false);
        onClose();
      }, 1000);
    } else {
      setIsRestoring(false);
      setShowConfirm(false);
    }
  };

  const cancelRestore = () => {
    setSelectedCheckpoint(null);
    setShowConfirm(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-2xl">
        {showConfirm ? (
          <>
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Restore Checkpoint</h2>
              <button onClick={cancelRestore} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-md p-4 mb-6">
                <h3 className="text-yellow-400 font-medium text-lg mb-2">Warning</h3>
                <p className="text-gray-300">
                  Restoring a checkpoint will replace your current code with the code from the selected checkpoint.
                  All unsaved changes will be lost. 
                </p>
                <p className="mt-2 text-gray-300">
                  Are you sure you want to proceed?
                </p>
              </div>
              
              {isRestoring ? (
                <div className="flex justify-center items-center py-4">
                  <RefreshCw size={24} className="text-blue-400 animate-spin mr-2" />
                  <span className="text-blue-400">Restoring checkpoint...</span>
                </div>
              ) : (
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={cancelRestore}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRestore}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center"
                  >
                    <Check size={16} className="mr-2" /> Yes, Restore
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold">Code Checkpoints</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {checkpoints.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No checkpoints created yet.</p>
                  <p className="mt-2 text-sm">Create a checkpoint to save your current code state.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {checkpoints.map((checkpoint, index) => (
                    <div 
                      key={checkpoint.id}
                      className="border border-gray-700 rounded-md p-3 hover:bg-gray-700/30"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-white">{checkpoint.name}</h3>
                          <div className="flex items-center mt-1 text-xs text-gray-400">
                            <Calendar size={12} className="mr-1" />
                            <span className="mr-3">{formatDate(checkpoint.timestamp)}</span>
                            <Clock size={12} className="mr-1" />
                            <span>{checkpoint.files.length} files</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRestore(checkpoint.id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                        >
                          Restore
                        </button>
                      </div>
                      
                      <div className="mt-2">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-300 hover:text-white py-1">
                            Files in this checkpoint
                          </summary>
                          <ul className="pl-4 mt-1 space-y-1 text-gray-400">
                            {checkpoint.files.map((file) => (
                              <li key={file.name} className="flex items-center">
                                <span className="w-4 h-4 mr-2 inline-block">
                                  {file.language === 'html' && '🌐'}
                                  {file.language === 'css' && '🎨'}
                                  {file.language === 'javascript' && '⚙️'}
                                  {!['html', 'css', 'javascript'].includes(file.language) && '📄'}
                                </span>
                                {file.name}
                              </li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-700 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CheckpointsModal;