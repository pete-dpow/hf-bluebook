export default function ChatBubble({
  role,
  content
}: {
  role: 'user' | 'ai';
  content: string;
}) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`rounded-2xl px-4 py-3 max-w-[75%] shadow-sm ${
          isUser
            ? 'bg-gray-100 text-gray-900'
            : 'bg-[#2563EB] text-white'
        }`}
        style={{ fontFamily: 'var(--font-ibm-plex)' }}
      >
        <p className='text-sm leading-relaxed whitespace-pre-wrap'>{content}</p>
      </div>
    </div>
  );
}
