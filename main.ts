import qrTerm from 'qrcode-terminal'

import { ChatGPTAPI } from 'chatgpt'

import {
  Contact,
  Message,
  ScanStatus,
  WechatyBuilder,
  log,
} from 'wechaty'

const chat_api = new ChatGPTAPI({
  apiKey: process.env.OPENAI_API_KEY
})

const bot = WechatyBuilder.build()

bot.on('scan', function (qrcode, status: ScanStatus) {
  if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
    const qrcodeImageUrl = [
      'https://wechaty.js.org/qrcode/',
      encodeURIComponent(qrcode),
    ].join('')
    console.info('StarterBot', 'onScan: %s(%s) - %s', ScanStatus[status], status, qrcodeImageUrl)

    qrTerm.generate(qrcode, { small: true })  // show qrcode on console

  } else {
    console.info('StarterBot', 'onScan: %s(%s)', ScanStatus[status], status)
  }
})

bot.on('login', function (user) {
  console.log(`${user} login`)
})

bot.on('logout', function (user) {
  console.log(`${user} logout`)
})

bot.on('friendship', async function (friendship) {
  console.log(`get FRIENDSHIP event!`)

  switch (friendship.type()) {
    case this.Friendship.Type.Receive:
      await friendship.accept()
      console.log(`accept friendship!`)
      break
    case this.Friendship.Type.Confirm:
      friendship.contact().say(`Nice to meet you~`)
      break
  }
})

const contact_context = {}

const get_chatgpt_response = async (text: string, contact: unknown, room_topic: unknown = ''): Promise<string> => {
  console.log('chatGPT 上下文：', contact_context[`${room_topic}:${contact}`])
  const res = await chat_api.sendMessage(text, {
    promptPrefix: '尽量使用中文回答问题',
    conversationId: contact_context[`${room_topic}:${contact}`]?.conversationId,
    parentMessageId: contact_context[`${room_topic}:${contact}`]?.parentMessageId
  })
  contact_context[`${room_topic}:${contact}`] = {
    conversationId: res.conversationId,
    parentMessageId: res.id
  }
  console.log('chatGPT response: ', res.text)
  return res.text
}

bot.on('message', async function (msg) {
  const contact = msg.talker()
  const text = msg.text()
  const room = msg.room()

  //   if (msg.self()) {
  //     return
  //   }

  if (room) {
    if (/#gpt/.test(text)) {
      const topic = await room.topic()
      const target_room = await bot.Room.find({ topic })
      if (target_room) {
        const chat_response = await get_chatgpt_response(text, contact, topic)
        target_room.say(chat_response)
      }
    }
  } else {
    const chat_response = await get_chatgpt_response(text, contact)
    msg.say(chat_response)
  }

  // if (room) {
  //   const topic = await room.topic()
  //   console.log(`Room: ${topic} Contact: ${contact.name()} Text: ${text}`)
  // } else {
  //   console.log(`Contact: ${contact.name()} Text: ${text}`)
  // }

  // if (/Hello/.test(text)) {
  //   msg.say('Welcome to wechaty, I am wechaty bot RUI!')
  // }

  // if (/room/.test(text)) {
  //   const keyroom = await bot.Room.find({ topic: 'wechaty test room' })

  //   if (keyroom) {
  //     const topic = await keyroom.topic()
  //     await keyroom.add(contact)
  //     await keyroom.say(`Welcome to join ${topic}`, contact)
  //   }
  // }

  // if (/fword/.test(text)) {
  //   let keyroom = await bot.Room.find({ topic: 'wechaty test room' })

  //   if (keyroom) {
  //     await keyroom.say('You said fword, I will remove from the room', contact)
  //     await keyroom.del(contact)
  //   }
  // }

})

bot.start()
  .catch(console.error)

