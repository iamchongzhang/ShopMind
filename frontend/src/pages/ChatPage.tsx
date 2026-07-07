import { useParams } from 'react-router-dom';
import ChatContainer from '../components/Chat/ChatContainer';

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  // Force remount when navigating to /chat (no id) vs /chat/:id
  return <ChatContainer key={id || 'new'} />;
}
