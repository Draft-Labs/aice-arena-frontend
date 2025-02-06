import { createContext, useContext, useState, useCallback } from 'react';
import OpenAI from "openai";

const OpenAIContext = createContext();

const openai = new OpenAI({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

export function OpenAIProvider({ children }) {
    const [chatHistory, setChatHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const sendMessage = useCallback(async (message, userAddress) => {
        setIsLoading(true);
        setError(null);

        try {
            // Add user's message to history
            const userMessage = {
                role: 'user',
                content: message,
                timestamp: new Date().toISOString(),
                sender: userAddress
            };

            setChatHistory(prev => [...prev, userMessage]);

            // Prepare the conversation history for the API
            const conversationHistory = chatHistory.slice(-5).map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Add the current message
            conversationHistory.push({
                role: 'user',
                content: message
            });

            // Add system message for context
            conversationHistory.unshift({
                role: 'system',
                content: `You are Aice, an AI assistant in the Aice Arena crypto casino. 
                         You are knowledgeable about cryptocurrency, blockchain, and gambling games like poker and blackjack.
                         Keep responses concise (max 2-3 sentences) and engaging. Be friendly but professional.
                         Never provide financial advice or encourage risky gambling behavior.
                         The user's wallet address is ${userAddress}.`
            });

            // Call OpenAI API
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: conversationHistory,
                max_tokens: 150,
                temperature: 0.7,
            });

            // Add AI's response to history
            const aiResponse = {
                role: 'assistant',
                content: completion.choices[0].message.content,
                timestamp: new Date().toISOString(),
                sender: 'Aice'
            };

            setChatHistory(prev => [...prev, aiResponse]);
            return aiResponse;

        } catch (err) {
            console.error('Error in OpenAI chat:', err);
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [chatHistory]);

    const clearChatHistory = useCallback(() => {
        setChatHistory([]);
    }, []);

    const value = {
        chatHistory,
        isLoading,
        error,
        sendMessage,
        clearChatHistory
    };

    return (
        <OpenAIContext.Provider value={value}>
            {children}
        </OpenAIContext.Provider>
    );
}

export function useOpenAI() {
    const context = useContext(OpenAIContext);
    if (!context) {
        throw new Error('useOpenAI must be used within an OpenAIProvider');
    }
    return context;
}