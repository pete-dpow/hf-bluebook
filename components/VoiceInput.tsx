import React, { useState, useEffect } from 'react';

export default function VoiceInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.interimResults = false;
        recog.lang = 'en-GB';

        recog.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          onTranscript(transcript);
          setIsRecording(false);
        };

        recog.onerror = () => setIsRecording(false);
        recog.onend = () => setIsRecording(false);
        setRecognition(recog);
      }
    }
  }, [onTranscript]);

  const toggleRecording = () => {
    if (!recognition) {
      alert('Speech recognition not supported in this browser.');
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.start();
      setIsRecording(true);
    }
  };

  return (
    <button
      onClick={toggleRecording}
      title={isRecording ? 'Stop listening' : 'Speak your message'}
      className={`ml-2 p-2 rounded-full border transition ${isRecording ? 'bg-red-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
    >
      {isRecording ? (
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={2} stroke='currentColor' className='w-5 h-5'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
        </svg>
      ) : (
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M12 18.75a6.75 6.75 0 006.75-6.75V9a6.75 6.75 0 00-13.5 0v3a6.75 6.75 0 006.75 6.75z' />
          <path strokeLinecap='round' strokeLinejoin='round' d='M8.25 21h7.5' />
        </svg>
      )}
    </button>
  );
}
