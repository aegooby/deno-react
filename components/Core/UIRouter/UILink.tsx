
import * as React from "https://esm.sh/react";

import UIRouter from "./UIRouter.tsx";

interface Props
{
    href: string;
    element: React.ReactElement;
}

export default class UILink extends React.Component<Props, unknown>
{
    constructor(props: Props)
    {
        super(props);
    }
    render(): React.ReactElement
    {
        const href = this.props.href;
        const element = this.props.element;
        function consumer(router: UIRouter | null): React.ReactElement
        {
            function onClick(): void
            {
                if (router)
                    router.reroute(href);
            }
            element.props.onClick = onClick;
            return element;
        }
        return <UIRouter.Context.Consumer>{consumer}</UIRouter.Context.Consumer>;
    }
}