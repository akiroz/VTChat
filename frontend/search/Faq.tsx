
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";

export default function Faq() {
    return (
        <>
            <Typography variant="h5">Q: What channels can be searched?</Typography>
            <Divider/>
            <Typography sx={{ margin: 3 }}>
                Under "advanced search", you may filter your search by channel.
                If your channel doesn't show up on the input field's autocomplete, it is not currently tracked.
                Feel free to contact me for new channel requests.
            </Typography>
            <Typography variant="h5">Q: What are tags?</Typography>
            <Divider/>
            <Typography sx={{ margin: 3 }}>
                Tags are arbitarary information attached to channels which can be used to narrow your search.
                Currently the only tags avaliable are agency names affliated with each vtuber but other tags may be avaliable in the future.
            </Typography>
        </>
    );
}