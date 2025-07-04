
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";

export default function About() {
    return (
        <>
            <Typography variant="h5">About VTChat</Typography>
            <Divider />
            <Typography sx={{ margin: 3 }}>
                VTChat is a livestream chat message search engine.
                It can be used to find specific topics discussed or mentions of someone else in long livestreams if the audiance has commented on it.
                It can also be used to find guest appearances or just funny moments in general by searching terms like "www" or "草".
                <br/>
                Chat searches can be narrowed to a specific channel 
            </Typography>
            <Typography variant="h5">Latest Updates</Typography>
            <Divider />
            <Typography sx={{ margin: 3 }}>
                <b>2025-07-05: </b>
                Added initial channel suggestions for advanced search.
                <br />
                <b>2025-05-20: </b>
                Allow single character search. Changing search term within results page. Added continuous seek feature up to 12 weeks.
                <br />
                <b>2024-04-02: </b>
                Initial release of VTChat 🎉 Tracked channels include all of the currently active <Link href="https://x.com/sainexxx">Saine sisters </Link>
                along with all vtubers affliated with the groups MEWLIVE, Specialite, and Varium. Happy searching!
            </Typography>
        </>
    );
}