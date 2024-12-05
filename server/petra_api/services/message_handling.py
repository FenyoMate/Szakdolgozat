

def save_response(chat, response):
    chat.messages.append({
        "role": "assistant",
        "content": response
    })
    chat.save()