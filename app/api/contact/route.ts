import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '../../lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { name, email, subject, message } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Save to Supabase
    await supabase.from('contact_submissions').insert({
      name,
      email,
      subject,
      message,
    })

    // Send email via Resend
    await resend.emails.send({
      from: 'NaijaOpportunities <onboarding@resend.dev>',
      to: ['goodnessengine2008@gmail.com', 'ogverse17@gmail.com'],
      subject: `[NaijaOpps Contact] ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
