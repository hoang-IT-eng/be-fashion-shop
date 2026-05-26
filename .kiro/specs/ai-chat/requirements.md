# Requirements Document

## Introduction

This document defines the requirements for an AI Shopping Assistant feature integrated into the be-fashion-shop NestJS backend. The assistant uses Google Gemini to provide real-time conversational shopping experiences via WebSocket, including product recommendations, outfit suggestions, order status inquiries, and direct cart management. Chat history is persisted in the database. Both authenticated and guest users can access the chat, with guests receiving limited functionality.

## Glossary

- **AI_Chat_Service**: The backend NestJS service responsible for managing chat sessions, communicating with Google Gemini, and orchestrating product lookups and cart actions.
- **Chat_Gateway**: The WebSocket gateway that handles real-time bidirectional communication between the client and the AI_Chat_Service.
- **Chat_Session**: A conversation thread between a user (or guest) and the AI Shopping Assistant, containing an ordered sequence of messages.
- **Chat_Message**: A single message within a Chat_Session, sent by either the user or the assistant.
- **Gemini_Client**: The integration layer that communicates with the Google Gemini API to generate AI responses.
- **Gemini_Function_Calling**: The capability where Gemini chooses and calls predefined backend functions (for example `searchProducts`) based on user intent.
- **Product_Context**: The product catalog data (names, descriptions, categories, prices, sizes, colors, stock) provided to the AI model for generating relevant recommendations.
- **Style_Profile**: Persisted preference signals for a user (style, preferred colors, categories, and keywords) learned from past conversations.
- **Guest_User**: An unauthenticated visitor who can use the chat with limited features (no cart actions, no order status).
- **Authenticated_User**: A logged-in user with full access to all chat features including cart management and order inquiries.
- **Streaming_Response**: A response delivered incrementally via WebSocket as the AI generates tokens, providing real-time feedback to the user.

## Requirements

### Requirement 1: WebSocket Connection Management

**User Story:** As a user, I want to connect to the AI chat via WebSocket, so that I can have real-time conversations with the shopping assistant.

#### Acceptance Criteria

1. WHEN an authenticated user initiates a WebSocket connection with a valid JWT token, THE Chat_Gateway SHALL establish the connection and associate it with the user's account.
2. WHEN a guest user initiates a WebSocket connection without a JWT token, THE Chat_Gateway SHALL establish the connection and assign a temporary session identifier.
3. IF a WebSocket connection attempt includes an invalid or expired JWT token, THEN THE Chat_Gateway SHALL reject the connection with an authentication error message.
4. WHEN a WebSocket connection is established, THE Chat_Gateway SHALL send a welcome message confirming the connection status and available features based on user type.
5. IF the WebSocket connection drops unexpectedly, THEN THE Chat_Gateway SHALL clean up the session resources and mark the session as disconnected.

### Requirement 2: Chat Message Processing

**User Story:** As a user, I want to send messages to the AI assistant and receive streaming responses, so that I can get immediate feedback while the AI generates its answer.

#### Acceptance Criteria

1. WHEN a user sends a chat message via WebSocket, THE AI_Chat_Service SHALL forward the message along with Product_Context to the Gemini_Client for processing and intent parsing.
2. WHEN the Gemini_Client generates response tokens, THE Chat_Gateway SHALL stream each token to the client as a Streaming_Response via WebSocket.
3. WHEN the Gemini_Client completes its response, THE Chat_Gateway SHALL send a completion event to the client indicating the response is finished.
4. IF the Gemini_Client returns an error or times out after 30 seconds, THEN THE AI_Chat_Service SHALL return a user-friendly error message via WebSocket and log the error details.
5. THE AI_Chat_Service SHALL auto-detect the language of the user's message and instruct the Gemini_Client to respond in the same language.
6. WHEN Gemini detects shopping intent in natural language, THE Gemini_Client SHALL extract structured filters (style, colors, categories, keywords, and optional price range) from the message.
7. WHEN Gemini invokes `searchProducts(category, color, priceRange, style)`, THE AI_Chat_Service SHALL execute the function with validated parameters and return the function result back to Gemini for final response generation.

### Requirement 3: Product Recommendation

**User Story:** As a shopper, I want to ask the AI assistant about products, so that I can find items that match my preferences without manually browsing.

#### Acceptance Criteria

1. WHEN a user asks about products (by category, color, size, price range, or description), THE AI_Chat_Service SHALL query the product catalog and include matching products in the AI response.
2. WHEN the AI_Chat_Service recommends products, THE Chat_Gateway SHALL emit a `product_recommendations` message type containing structured product data (id, name, price, imageUrl, available sizes, colors) alongside a user-facing message.
3. WHILE generating product recommendations, THE AI_Chat_Service SHALL only recommend products where isActive is true and stock is greater than zero.
4. WHEN a user asks for products within a price range, THE AI_Chat_Service SHALL filter products by the specified minimum and maximum price values.
5. IF no products match the extracted filters, THEN THE Chat_Gateway SHALL return an empty `product_recommendations` payload with guidance to broaden preferences.

### Requirement 4: Outfit and Style Suggestions

**User Story:** As a fashion-conscious shopper, I want the AI to suggest complete outfits, so that I can discover coordinated looks without styling expertise.

#### Acceptance Criteria

1. WHEN a user requests outfit suggestions, THE AI_Chat_Service SHALL select complementary products from different categories and present them as a coordinated set.
2. WHEN the AI_Chat_Service presents an outfit suggestion, THE Chat_Gateway SHALL include structured data for each item in the outfit (id, name, price, imageUrl, category).
3. WHEN a user specifies an occasion or style preference, THE AI_Chat_Service SHALL tailor outfit suggestions to match the stated preference.
4. THE AI_Chat_Service SHALL calculate and include the total price of the suggested outfit in the response.

### Requirement 5: Cart Management from Chat

**User Story:** As an authenticated user, I want to add products to my cart directly from the chat, so that I can shop without leaving the conversation.

#### Acceptance Criteria

1. WHEN an authenticated user requests to add a product to the cart from the chat, THE AI_Chat_Service SHALL invoke the cart service to add the specified product with the given size, color, and quantity.
2. WHEN a product is successfully added to the cart, THE Chat_Gateway SHALL confirm the action with the product name, selected variant, quantity, and updated cart total.
3. IF an authenticated user requests to add a product that is out of stock or does not exist, THEN THE AI_Chat_Service SHALL inform the user that the product is unavailable and suggest alternatives.
4. IF a guest user attempts to add a product to the cart, THEN THE AI_Chat_Service SHALL inform the guest that login is required for cart operations and provide guidance on how to log in.
5. WHEN an authenticated user asks to view their current cart contents, THE AI_Chat_Service SHALL retrieve and display the cart items with names, quantities, and total price.

### Requirement 6: Order Status Inquiry

**User Story:** As an authenticated user, I want to ask the AI about my order status, so that I can get quick updates without navigating to the orders page.

#### Acceptance Criteria

1. WHEN an authenticated user asks about their order status, THE AI_Chat_Service SHALL retrieve the user's orders and present the relevant status information (order id, status, items, total, creation date).
2. WHEN an authenticated user asks about a specific order by ID, THE AI_Chat_Service SHALL retrieve that order's details and present the current status, payment status, and shipping information.
3. IF an authenticated user asks about an order that does not belong to them, THEN THE AI_Chat_Service SHALL respond that no matching order was found without revealing other users' data.
4. IF a guest user attempts to inquire about order status, THEN THE AI_Chat_Service SHALL inform the guest that login is required to view order information.

### Requirement 7: Chat History Persistence

**User Story:** As a user, I want my chat conversations to be saved, so that I can revisit previous interactions and recommendations.

#### Acceptance Criteria

1. WHEN a chat message is sent or received, THE AI_Chat_Service SHALL persist the Chat_Message to the database with the session identifier, sender role, content, and timestamp.
2. WHEN an authenticated user reconnects, THE AI_Chat_Service SHALL load the most recent Chat_Session history (up to 50 messages) and provide it to the Gemini_Client as conversation context.
3. WHEN an authenticated user requests their chat history, THE AI_Chat_Service SHALL return a paginated list of past Chat_Sessions with the last message preview and timestamp.
4. THE AI_Chat_Service SHALL retain guest user chat history only for the duration of the active session; guest history SHALL NOT be persisted after disconnection.
5. WHEN an authenticated user requests deletion of a Chat_Session, THE AI_Chat_Service SHALL permanently remove all Chat_Messages associated with that session from the database.
6. WHEN an authenticated user's preferences can be inferred from conversation history, THE AI_Chat_Service SHALL update and persist a Style_Profile for use in future recommendation requests.
7. WHEN an authenticated user starts a new session, THE AI_Chat_Service SHALL load the Style_Profile (if available) and use it as additional context for Gemini and product search.

### Requirement 8: Product Context and RAG Integration

**User Story:** As a shopper, I want the AI to have accurate knowledge of the store's current inventory, so that recommendations are always relevant and up-to-date.

#### Acceptance Criteria

1. THE AI_Chat_Service SHALL construct Product_Context by querying active products with their names, descriptions, categories, prices, sizes, colors, and stock levels.
2. WHEN the product catalog changes (new products added, stock updated, products deactivated), THE AI_Chat_Service SHALL refresh the Product_Context within 5 minutes of the change.
3. THE AI_Chat_Service SHALL limit the Product_Context sent to the Gemini_Client to the most relevant products (maximum 20 products per request) based on the user's query.
4. WHEN the user's query does not match any products in the catalog, THE AI_Chat_Service SHALL inform the user that no matching products were found and suggest broadening the search criteria.

### Requirement 9: Guest vs Authenticated Feature Access

**User Story:** As a product owner, I want guest users to have limited chat features, so that they are encouraged to create an account for the full experience.

#### Acceptance Criteria

1. WHILE a guest user is connected, THE Chat_Gateway SHALL allow product browsing, recommendations, and outfit suggestions.
2. WHILE a guest user is connected, THE Chat_Gateway SHALL restrict cart management and order status features, responding with a login prompt when these are attempted.
3. WHILE an authenticated user is connected, THE Chat_Gateway SHALL allow access to all features including product recommendations, outfit suggestions, cart management, order inquiries, and chat history retrieval.
4. WHEN a guest user sends more than 20 messages in a single session, THE AI_Chat_Service SHALL inform the user that the message limit has been reached and suggest creating an account for unlimited access.

### Requirement 10: Error Handling and Rate Limiting

**User Story:** As a system administrator, I want the chat service to handle errors gracefully and prevent abuse, so that the system remains stable and costs are controlled.

#### Acceptance Criteria

1. IF the Google Gemini API is unavailable or returns a service error, THEN THE AI_Chat_Service SHALL respond with a friendly message indicating temporary unavailability and suggest the user try again later.
2. IF an authenticated user exceeds 60 messages per hour, THEN THE AI_Chat_Service SHALL reject additional messages with a rate limit notification and inform the user when they can resume.
3. IF a guest user exceeds 20 messages per session, THEN THE AI_Chat_Service SHALL reject additional messages and prompt the user to create an account.
4. IF the AI_Chat_Service receives a malformed or empty message, THEN THE Chat_Gateway SHALL respond with a validation error indicating the message format requirements.
5. THE AI_Chat_Service SHALL log all errors from the Gemini_Client with request context for debugging purposes without exposing internal details to the user.

### Requirement 11: Gemini Configuration and Secrets

**User Story:** As a developer, I want Gemini credentials and model configuration to be managed via environment variables, so that secrets remain secure and environments are easy to configure.

#### Acceptance Criteria

1. THE Gemini_Client SHALL read API credentials from environment variables (for example `GEMINI_API_KEY`) and SHALL NOT hardcode secrets in source code.
2. IF `GEMINI_API_KEY` is missing at startup, THEN the application SHALL fail fast with a clear configuration error.
3. THE application SHALL provide documented environment variable names and sample values in `.env.example`.
