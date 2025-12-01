export async function POST() {
  return Response.json({
    highlight: "<b>cat</b> should be 'a cat'.",
    sample: "I saw a cat running around the park while I was jogging.",
    speed_wpm: 82,
    pause_count: 5,
    clarity: 7,
  });
}
